// Generic generated fallback; replace it with licensed destination photography.
const genericLandscape = "/travel-fallback.png";
const genericNotebook = "/travel-fallback.png";

export const travelImages = {
  istanbul: genericLandscape,
  hagiaSophia: genericLandscape,
  cappadocia: genericLandscape,
  antalya: genericLandscape,
  ankara: genericLandscape,
  tbilisi: genericLandscape,
  yerevan: genericLandscape,
  baku: genericLandscape,
  journal: genericNotebook,
  notebook: genericNotebook,
};

export function getTravelImageForLocation(_city?: string, _place?: string) {
  return genericLandscape;
}
