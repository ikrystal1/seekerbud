/**
 * SeekerBud Icon Generator
 *
 * Generates all required app icons from ../SeekerBud.png
 * Run with: node scripts/generate-icons.js
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SOURCE = path.resolve(__dirname, "../../SeekerBud.png");
const ASSETS = path.resolve(__dirname, "../assets");

// ─── Icon definitions ────────────────────────────────────────────────────────

const ICONS = [
  // ── Expo standard assets ──────────────────────────────────────────────────
  {
    name: "icon.png",
    width: 1024,
    height: 1024,
    description: "App icon (iOS App Store + Expo default)",
    bg: "#0B0B12",       // dark bg so the mascot sits properly
    padding: 160,
  },
  {
    name: "adaptive-icon.png",
    width: 1024,
    height: 1024,
    description: "Android adaptive icon foreground (transparent bg)",
    bg: null,            // transparent — Android supplies its own bg layer
    padding: 200,
  },
  {
    name: "splash.png",
    width: 1284,
    height: 2778,
    description: "Splash screen (iPhone 14 Pro Max resolution)",
    bg: "#0B0B12",
    padding: null,       // centered, mascot = 420px
    mascotSize: 420,
  },
  {
    name: "favicon.png",
    width: 48,
    height: 48,
    description: "Web favicon",
    bg: "#0B0B12",
    padding: 6,
  },

  // ── Android mipmap launcher icons (in case of bare workflow) ──────────────
  {
    name: "mipmap/mipmap-mdpi/ic_launcher.png",
    width: 48,
    height: 48,
    description: "Android mdpi launcher",
    bg: "#0B0B12",
    padding: 6,
  },
  {
    name: "mipmap/mipmap-hdpi/ic_launcher.png",
    width: 72,
    height: 72,
    description: "Android hdpi launcher",
    bg: "#0B0B12",
    padding: 9,
  },
  {
    name: "mipmap/mipmap-xhdpi/ic_launcher.png",
    width: 96,
    height: 96,
    description: "Android xhdpi launcher",
    bg: "#0B0B12",
    padding: 12,
  },
  {
    name: "mipmap/mipmap-xxhdpi/ic_launcher.png",
    width: 144,
    height: 144,
    description: "Android xxhdpi launcher",
    bg: "#0B0B12",
    padding: 18,
  },
  {
    name: "mipmap/mipmap-xxxhdpi/ic_launcher.png",
    width: 192,
    height: 192,
    description: "Android xxxhdpi launcher",
    bg: "#0B0B12",
    padding: 24,
  },
  {
    name: "mipmap/mipmap-xxxhdpi/ic_launcher_round.png",
    width: 192,
    height: 192,
    description: "Android round launcher icon",
    bg: "#0B0B12",
    padding: 24,
    circle: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/** Build a circular mask SVG for round icons */
function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`
  );
}

async function generateIcon(icon) {
  const { name, width, height, bg, padding, mascotSize, circle } = icon;

  const outPath = path.join(ASSETS, name);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Size of the mascot inside the canvas
  const innerSize = mascotSize ?? (Math.min(width, height) - (padding ?? 0) * 2);

  // Resize mascot
  let mascot = sharp(SOURCE).resize(innerSize, innerSize, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  // Composite onto background
  const bgColor = bg ? hexToRgb(bg) : null;

  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bgColor
        ? { r: bgColor.r, g: bgColor.g, b: bgColor.b, alpha: 255 }
        : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const mascotBuf = await mascot.png().toBuffer();

  let result = canvas.composite([
    {
      input: mascotBuf,
      gravity: "center",
    },
  ]);

  // Apply circular mask for round icons
  if (circle) {
    const mask = circleMask(width);
    result = result.composite([{ input: mask, blend: "dest-in" }]);
  }

  await result.png().toFile(outPath);
  console.log(`✓  ${name.padEnd(50)} ${width}×${height}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🤖  SeekerBud Icon Generator\n");
  console.log(`Source : ${SOURCE}`);
  console.log(`Output : ${ASSETS}\n`);

  if (!fs.existsSync(SOURCE)) {
    console.error("❌  SeekerBud.png not found at:", SOURCE);
    process.exit(1);
  }

  // Print source image info
  const meta = await sharp(SOURCE).metadata();
  console.log(`Source size: ${meta.width}×${meta.height} (${meta.format})\n`);

  let ok = 0;
  let fail = 0;

  for (const icon of ICONS) {
    try {
      await generateIcon(icon);
      ok++;
    } catch (err) {
      console.error(`✗  ${icon.name}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${ok} icons generated${fail ? `, ${fail} failed` : ""} ✅\n`);
}

main();
