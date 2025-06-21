// bundle-functions.js
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['netlify/functions/send-simulation.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'netlify/functions/send-simulation-bundled.js',
}).catch(() => process.exit(1));
