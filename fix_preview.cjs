const fs = require('fs');
let code = fs.readFileSync('src/components/YouTubeCardPreview.tsx', 'utf-8');

const imports = `import { TREND_DATA } from "../data/constants";
import { analyzeThumbnailEmotions, type ThumbnailEmotionAnalysis } from "../services/ai/visualPromptService";
import { optimizeTitle } from "../services/ai/seoService";
import { copyToClipboard as copyTextToClipboard } from "../utils/helpers";
import { logger } from "../config/logger";
import { X, Save, Users } from "lucide-react";
`;

code = code.replace("import { fontStyleMap", imports + "import { fontStyleMap");
fs.writeFileSync('src/components/YouTubeCardPreview.tsx', code);
console.log('Fixed YouTubeCardPreview.tsx');
