import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface DreaminaTaskResult {
  submitId: string;
  status: 'querying' | 'success' | 'fail';
  resultUrls?: string[];
  failReason?: string;
}

export class DreaminaService {
  private static cliPath = 'C:\\Users\\minicomputer\\.dreamina_cli\\dreamina.exe';

  /**
   * Reads the latest Dreamina CLI logs to check if the user has CLI permissions.
   */
  public static async getCliPermissionStatus(): Promise<boolean> {
    try {
      const logsDir = 'C:\\Users\\minicomputer\\.dreamina_cli\\logs';
      const files = await fs.readdir(logsDir);
      // Filter dreamina.log.* files
      const logFiles = files.filter(f => f.startsWith('dreamina.log.'));
      if (logFiles.length === 0) return true; // Default to true if no logs exist

      // Sort by name descending to get the newest files first
      logFiles.sort((a, b) => b.localeCompare(a));

      // Read up to the 2 newest files to find has_cli_permission
      for (const logFile of logFiles.slice(0, 2)) {
        const filePath = path.join(logsDir, logFile);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Find the last occurrence of has_cli_permission in this file
        const matches = [...content.matchAll(/has_cli_permission=(\w+)/g)];
        if (matches.length > 0) {
          const lastMatch = matches[matches.length - 1][1];
          return lastMatch === 'true';
        }
      }
      
      return true; // Default to true if not found in log
    } catch (e) {
      console.error('[DreaminaService] Failed to check CLI permission from logs:', e);
      return true; // Default to true on error so we don't block unnecessarily
    }
  }


  /**
   * Checks if the CLI has a valid login session
   * Runs `dreamina user_credit` to test session validity.
   */
  public static async checkLoginStatus(): Promise<{ loggedIn: boolean; credit?: number }> {
    return new Promise((resolve) => {
      const child = spawn(this.cliPath, ['user_credit']);
      let stdout = '';
      let stderr = '';

      child.on('error', (err) => {
        console.error('[DreaminaService] checkLoginStatus spawn error:', err.message);
        resolve({ loggedIn: false });
      });

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          // Parse credit
          // Output format: "当前剩余积分: 120" or similar
          const creditMatch = stdout.match(/(?:当前剩余积分|remaining credit):\s*(\d+(\.\d+)?)/) || stdout.match(/(\d+)/);
          const credit = creditMatch ? parseFloat(creditMatch[1]) : 0;
          resolve({ loggedIn: true, credit });
        } else {
          resolve({ loggedIn: false });
        }
      });
    });
  }

  /**
   * Clears the local login session by running "dreamina logout".
   */
  public static async logout(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(this.cliPath, ['logout']);
      child.on('error', (err) => {
        console.error('[DreaminaService] logout spawn error:', err.message);
        resolve(false);
      });
      child.on('close', (code) => {
        resolve(code === 0);
      });
    });
  }

  /**
   * Starts a headless login process
   * We will capture the QR path and resolve when logged in successfully.
   */
  public static async startHeadlessLogin(
    onAuthDetailsReady: (verificationUri: string, userCode: string, deviceCode: string) => void,
    onSuccess: () => void,
    onError: (err: string) => void
  ): Promise<any> {
    // Run "dreamina login" without "--headless" so the CLI keeps polling the official API in the background.
    // It will write the credentials and exit with code 0 once the user completes the browser authorization.
    const child = spawn(this.cliPath, ['login']);
    child.on('error', (err) => {
      console.error('[DreaminaService] startHeadlessLogin spawn error:', err.message);
      onError(err.message);
    });
    let isSuccess = false;
    let verificationUri = '';
    let userCode = '';
    let deviceCode = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Dreamina Service Output]:', output);

      // 解析 OAuth Device Flow 细节
      const uriMatch = output.match(/verification_uri:\s*(\S+)/) || output.match(/verification_uri=([^\n]+)/);
      const userCodeMatch = output.match(/user_code:\s*(\S+)/) || output.match(/user_code=([^\n]+)/);
      const deviceCodeMatch = output.match(/device_code:\s*(\S+)/) || output.match(/device_code=([^\n]+)/);

      if (uriMatch && !verificationUri) { verificationUri = uriMatch[1].trim(); }
      if (userCodeMatch && !userCode) { userCode = userCodeMatch[1].trim(); }
      if (deviceCodeMatch && !deviceCode) { deviceCode = deviceCodeMatch[1].trim(); }

      if (verificationUri && userCode && deviceCode) {
        onAuthDetailsReady(verificationUri, userCode, deviceCode);
        // 清空变量防止重复触发
        verificationUri = '';
        userCode = '';
        deviceCode = '';
      }

      if (output.includes('[DREAMINA:LOGIN_SUCCESS]') || output.includes('[DREAMINA:LOGIN_REUSED]')) {
        isSuccess = true;
        onSuccess();
        child.kill();
      }
    });

    child.stderr.on('data', (data) => {
      const errOut = data.toString();
      console.error('[Dreamina Service Error Output]:', errOut);
      if (errOut.includes('error') || errOut.includes('fail')) {
        onError(errOut);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        isSuccess = true;
        onSuccess();
      } else if (code !== 0 && !isSuccess && code !== null) {
        onError(`Login process exited with code ${code}`);
      }
    });

    return child;
  }

  /**
   * Submits a text-to-image task
   */
  public static async text2Image(params: {
    prompt: string;
    ratio?: string;
    model?: string;
    resolutionType?: string;
  }): Promise<{ submitId: string; status: 'querying' }> {
    return new Promise((resolve, reject) => {
      const args = ['text2image', `--prompt=${params.prompt}`];
      if (params.ratio) args.push(`--ratio=${params.ratio}`);
      if (params.model) args.push(`--model_version=${params.model}`);
      if (params.resolutionType) args.push(`--resolution_type=${params.resolutionType}`);
      // Disable auto polling since we want async polling via database/cron
      args.push('--poll=0');

      const child = spawn(this.cliPath, args);
      let stdout = '';
      let stderr = '';

      child.on('error', (err) => {
        console.error('[DreaminaService] text2Image spawn error:', err.message);
        reject(new Error(`无法启动即梦 CLI 工具，请检查其是否正确安装或配置了环境变量。内部错误: ${err.message}`));
      });

      child.stdout.on('data', (data) => { stdout += data.toString(); });
      child.stderr.on('data', (data) => { stderr += data.toString(); });

      child.on('close', async (code) => {
        if (code !== 0) {
          const hasPermission = await DreaminaService.getCliPermissionStatus();
          if (!hasPermission) {
            return reject(new Error('您的账号尚未开通即梦官方 CLI/API 开发者白名单权限，请先登录官方控制台申请，或在状态管理中切换已开通权限的账号重新登录。'));
          }
          return reject(new Error(`Failed to submit text2image task: ${stderr || stdout}`));
        }

        // Match submit_id in stdout
        const submitIdMatch = stdout.match(/submit_id:\s*(\S+)/) || stdout.match(/"submit_id":\s*"([^"]+)"/) || stdout.match(/submit_id=([a-zA-Z0-9_-]+)/);
        const submitId = submitIdMatch ? submitIdMatch[1] : '';

        if (!submitId) {
          return reject(new Error(`Submit ID not found in CLI output: ${stdout}`));
        }

        resolve({ submitId, status: 'querying' });
      });
    });
  }

  /**
   * Queries task result and downloads to local directory
   */
  public static async queryResult(submitId: string, downloadDir: string): Promise<DreaminaTaskResult> {
    return new Promise((resolve, reject) => {
      // Ensure download directory exists
      fs.mkdir(downloadDir, { recursive: true }).then(() => {
        const args = ['query_result', `--submit_id=${submitId}`, `--download_dir=${downloadDir}`];
        const child = spawn(this.cliPath, args);
        let stdout = '';
        let stderr = '';

        child.on('error', (err) => {
          console.error('[DreaminaService] queryResult spawn error:', err.message);
          reject(new Error(`无法启动即梦 CLI 工具进行任务查询。内部错误: ${err.message}`));
        });

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', async (code) => {
          if (code !== 0) {
            if (stdout.includes('querying') || stdout.includes('pending')) {
              return resolve({ submitId, status: 'querying' });
            }
            return reject(new Error(`Query command failed: ${stderr || stdout}`));
          }

          try {
            if (stdout.includes('fail') || stdout.includes('fail_reason')) {
              const failMatch = stdout.match(/fail_reason:\s*(.+)/) || stdout.match(/fail_reason=([^\n]+)/);
              const failReason = failMatch ? failMatch[1].trim() : 'Task generation failed';
              return resolve({ submitId, status: 'fail', failReason });
            }

            if (stdout.includes('success')) {
              const files: string[] = [];
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes('downloaded:') || line.includes('Saved to:') || line.includes('saved to:')) {
                  const filePathMatch = line.match(/(?:downloaded|Saved to|saved to):\s*(.+)/);
                  if (filePathMatch) {
                    const absolutePath = filePathMatch[1].trim();
                    const relativePath = '/uploads/dreamina/' + path.basename(absolutePath);
                    files.push(relativePath);
                  }
                }
              }

              // Fallback: search directory for files containing the submit_id
              if (files.length === 0) {
                try {
                  const dirFiles = await fs.readdir(downloadDir);
                  for (const file of dirFiles) {
                    if (file.includes(submitId)) {
                      files.push('/uploads/dreamina/' + file);
                    }
                  }
                } catch (e) {}
              }

              return resolve({
                submitId,
                status: 'success',
                resultUrls: files.length > 0 ? files : []
              });
            }

            // Fallback if status is querying
            resolve({ submitId, status: 'querying' });
          } catch (err) {
            reject(err);
          }
        });
      }).catch(reject);
    });
  }
}
