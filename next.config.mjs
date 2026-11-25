import path from 'node:path';
export default { output: 'standalone', webpack: (config) => { config.resolve.alias['@'] = path.resolve(process.cwd(), 'src'); return config; } };
