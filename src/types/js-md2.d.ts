declare module 'js-md2' {
  /**
   * Computes the MD2 hash of a string
   * @param message - The input string to hash
   * @returns The MD2 hash as a hexadecimal string
   */
  function md2(message: string): string;
  
  export default md2;
}