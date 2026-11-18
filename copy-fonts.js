// Salin font TTF untuk katalog PDF dari node_modules ke public/fonts saat build.
const fs = require("fs"), path = require("path");
const files = [
  "@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf",
  "@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf",
  "@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf",
];
const out = path.join(__dirname, "public", "fonts");
fs.mkdirSync(out, { recursive: true });
for (const f of files) fs.copyFileSync(path.join(__dirname, "node_modules", f), path.join(out, path.basename(f)));
console.log("fonts", files.length);
