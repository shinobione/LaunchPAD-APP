import fs from 'node:fs';

const [outputPath, target] = process.argv.slice(2);
if (!outputPath || !target) {
  throw new Error('Usage: node scripts/report-wrangler-deploy.mjs <wrangler-output.ndjson> <target>');
}

const entries = fs.readFileSync(outputPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const deployment = [...entries].reverse().find(entry => entry.type === 'deploy');
if (!deployment) throw new Error(`No deploy entry found in ${outputPath}`);

const targets = Array.isArray(deployment.targets) ? deployment.targets : [];
const summary = [
  `### Cloudflare ${target} deployment`,
  '',
  `- Worker: \`${deployment.worker_name || 'unknown'}\``,
  `- Version ID: \`${deployment.version_id || 'unknown'}\``,
  `- Git SHA: \`${process.env.GITHUB_SHA || 'unknown'}\``,
  `- Targets: ${targets.length ? targets.map(value => `\`${value}\``).join(', ') : 'none reported'}`,
  '',
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
console.log(JSON.stringify({
  target,
  worker: deployment.worker_name,
  versionId: deployment.version_id,
  targets,
}));
