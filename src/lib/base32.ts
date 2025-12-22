const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PADDING = "=";

export function base32Encode(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  while (output.length % 8 !== 0) {
    output += PADDING;
  }

  return output;
}

export function base32Decode(input: string): string {
  input = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  let output: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const index = ALPHABET.indexOf(input[i]);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${input[i]}`);
    }

    value = (value << 5) | index;
    bits += 5;

    while (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(output));
}
