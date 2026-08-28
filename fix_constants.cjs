const fs = require('fs');
let code = fs.readFileSync('src/data/constants.ts', 'utf-8');
const icons = ['Camera', 'Flame', 'Clock', 'Sparkles', 'Grid', 'Palette', 'Box', 'Zap', 'Square', 'Droplets', 'Pencil', 'Paintbrush', 'BookOpen', 'PenTool', 'Wand2', 'Radio', 'Cog', 'Star', 'Moon', 'Eye', 'Cloud', 'Triangle', 'Hexagon', 'Coffee', 'Trophy', 'Sun', 'Briefcase', 'Wind', 'Heart', 'Headphones', 'Laugh', 'Target', 'Music', 'Gamepad2', 'Lightbulb', 'Users', 'TrendingUp', 'Activity', 'Scissors', 'Shirt', 'Car', 'Clapperboard', 'Brain', 'Dog', 'Newspaper', 'Home', 'Stethoscope', 'Brush', 'FlaskConical', 'Film', 'Coins', 'Baby', 'Library'];
const uniqueIcons = [...new Set(icons)];
const importStmt = `import { ${uniqueIcons.join(', ')} } from "lucide-react";\n`;
fs.writeFileSync('src/data/constants.ts', importStmt + code);
console.log('Fixed constants.ts');
