declare module "*.mp3" {
  const src: string;
  export default src;
}

// Fourni par le bundler (Rspack) : charge tout un dossier de fichiers.
declare const require: {
  context(
    directory: string,
    recursive: boolean,
    filter: RegExp,
  ): {
    (key: string): string | { default: string };
    keys(): string[];
  };
};
