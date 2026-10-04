// Future relocation data belongs behind this boundary so map UI stays independent of providers.
export async function getLocationData(_location) { return { weather: null, housing: null, costOfLiving: null, transit: null }; }
