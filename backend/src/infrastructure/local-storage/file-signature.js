const SIGNATURES = [
  {
    mimeType: "image/png",
    extension: "png",
    matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mimeType: "image/jpeg",
    extension: "jpg",
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: "image/webp",
    extension: "webp",
    matches: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP",
  },
];

function detectImageSignature(buffer) {
  return SIGNATURES.find((signature) => signature.matches(buffer)) || null;
}

module.exports = { detectImageSignature };
