const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/SkinAnalysisProReport.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const drawCanvasStart = code.indexOf('  const drawCanvas = useCallback(() => {');
const drawCanvasEndStr = '  }, [record, viewMode]);\n';
const drawCanvasEnd = code.indexOf(drawCanvasEndStr, drawCanvasStart) + drawCanvasEndStr.length;
const drawCanvasCode = code.substring(drawCanvasStart, drawCanvasEnd).replace(/^  /gm, '');

const getModeFilterStart = code.indexOf('  // CSS filter: adjust for Megvii maps');
const getModeFilterEndStr = '  const imgFilter = getModeFilter();\n';
const getModeFilterEnd = code.indexOf(getModeFilterEndStr, getModeFilterStart) + getModeFilterEndStr.length;
const getModeFilterCode = code.substring(getModeFilterStart, getModeFilterEnd).replace(/^  /gm, '');

const viewerStart = code.indexOf('          <div className="relative bg-stone-900 flex justify-center items-center" style={{ minHeight: 200 }}>');
const viewerEndStr = '          </div>\n\n\n          {/* View Mode Buttons */}';
const viewerEnd = code.indexOf(viewerEndStr, viewerStart);
const viewerCode = code.substring(viewerStart, viewerEnd + '          </div>\n'.length).replace(/^          /gm, '    ');

const skinMapViewerComponent = `
const SkinMapViewer = ({ viewMode, record, mapUrls, className = '' }: { viewMode: ViewMode, record: any, mapUrls: Record<string, string>, className?: string }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

\${getModeFilterCode}
\${drawCanvasCode}
  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const handler = () => drawCanvas();
    img.addEventListener('load', handler);
    if (img.complete) drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => { img.removeEventListener('load', handler); window.removeEventListener('resize', drawCanvas); };
  }, [drawCanvas]);

  useEffect(() => { drawCanvas(); }, [viewMode, drawCanvas]);

  return (
\${viewerCode.replace('style={{ minHeight: 200 }}', \`className={\\\`\${className}\\\`}\`)}
  );
};
`;

code = code.replace('export default function SkinAnalysisProReport() {', skinMapViewerComponent + '\nexport default function SkinAnalysisProReport() {');

// Clean up original component
code = code.replace('  const imageRef = useRef<HTMLImageElement>(null);\n  const canvasRef = useRef<HTMLCanvasElement>(null);\n', '  const [showAllImages, setShowAllImages] = useState(false);\n');
code = code.substring(0, drawCanvasStart) + code.substring(code.indexOf('  if (loading) return'));

// Replace viewer and add button
const viewerHtmlToReplace = code.substring(code.indexOf('        {/* Image Viewer */}'), code.indexOf('          {/* View Mode Buttons */}'));
code = code.replace(viewerHtmlToReplace, `        {/* Image Viewer */}
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden relative">
          <button 
            onClick={() => setShowAllImages(true)}
            className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur text-stone-800 border border-stone-200 text-xs px-3 py-1.5 rounded-full shadow-sm font-medium hover:bg-stone-50"
          >
            展开全景10图
          </button>
          <SkinMapViewer viewMode={viewMode} record={record} mapUrls={mapUrls} className="min-h-[200px]" />

`);

// Add modal HTML at the end of the main tag
const modalHtml = `
      {showAllImages && (
        <div className="fixed inset-0 z-50 bg-stone-900 overflow-y-auto">
          <div className="p-4 flex items-center justify-between sticky top-0 bg-stone-900/90 backdrop-blur z-20 border-b border-stone-800">
            <h2 className="text-white font-bold tracking-widest">全景模式 - 10项皮肤图谱</h2>
            <button onClick={() => setShowAllImages(false)} className="px-5 py-2 bg-stone-800 text-stone-200 rounded-full hover:bg-stone-700 text-sm font-medium">
              关闭全景
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {VIEW_MODES.map(v => (
              <div key={v.key} className="bg-black rounded-xl overflow-hidden border border-stone-800 flex flex-col">
                <div className="px-3 py-2 bg-stone-800/50 text-white text-xs font-bold text-center border-b border-stone-800">
                  {v.label}
                </div>
                <SkinMapViewer record={record} mapUrls={mapUrls} viewMode={v.key} className="h-[250px] lg:h-[300px]" />
              </div>
            ))}
          </div>
        </div>
      )}
`;

code = code.replace('      </main>\n    </div>', modalHtml + '      </main>\n    </div>');

fs.writeFileSync(filePath, code);
console.log("Refactoring complete");
