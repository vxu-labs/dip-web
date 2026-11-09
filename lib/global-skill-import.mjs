const hosts = new Set(['codex', 'claude', 'manual']);
const policies = new Set(['host-default', 'host-managed', 'explicit-only', 'model-only', 'unknown']);
export function parseGlobalSkills(data) {
  if (data?.format !== 'dip-global-skills-v1' || !Array.isArray(data.skills) || data.skills.length > 1000)
    throw new Error('Choose a global skill export from DIP Local.');
  return data.skills.map(({name, host, activation} = {}) => {
    if (typeof name !== 'string' || !name.trim() || name.length > 150 || !hosts.has(host) || !policies.has(activation))
      throw new Error('The file contains invalid global skill metadata.');
    return {name, host, activation};
  });
}
