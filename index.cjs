const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

function wrapper(str) {
  str = str.replace("export { Peisar };", "");
  return `/**
 * Browser Bundled for Peisar
 *
 * GitHub Repository : {@link https://github.com/phothinmg/peisar}
 *
 * License : {@link https://github.com/phothinmg/peisar/blob/main/LICENSE}
 */
(function(){
  
${str}

  if (typeof window !== "undefined" && typeof window.Peisar === "undefined") {
    window.Peisar = Peisar;
  }
})()`;
}

async function main() {
  // run susee build
  await execPromise("npx susee build");
  console.log("Done : susee build");
  // target folder in main repo
  const targetDir = path.resolve(__dirname, "../browser");
  if (fs.existsSync(targetDir)) {
    await fs.promises.rm(targetDir, { recursive: true, force: true });
  } else {
    await fs.promises.mkdir(targetDir);
  }
  console.log("Done : checked and created target");
  // check local build
  const destDir = path.resolve(__dirname, "dist");
  const filePath = path.resolve(__dirname, "dist/index.mjs");
  if (!fs.existsSync(filePath)) {
    console.error(`Susee build not found.`);
    process.exit(1);
  }
  // read from dist
  const jsContent = await fs.promises.readFile(filePath, "utf8");
  // warp with iife
  const iifeContent = wrapper(jsContent);
  // write to main repo
  const outFilePath = path.resolve(__dirname, "../browser/peisar.js");
  await fs.promises.writeFile(outFilePath, iifeContent);
  console.log("Done : read and write to target");
  await fs.promises.rm(destDir, { recursive: true, force: true });
}

main();
