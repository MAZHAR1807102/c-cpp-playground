// macOS: Apple Silicon refuses to run unsigned code, so give the finished universal app an ad-hoc signature.
// (No paid Apple certificate is used; see README for the one-time "Open Anyway" step.)
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { Arch } = require('electron-builder');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return;
  // a universal build packs x64 and arm64 separately first, then merges them: sign only the merged app,
  // because signing the halves would make them differ and the merge would fail
  if (context.arch !== Arch.universal) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--verbose', app], { stdio: 'inherit' });
};
