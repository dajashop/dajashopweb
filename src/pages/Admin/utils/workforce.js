export const rsd = (minor) =>
  `${(Number(minor || 0) / 100).toLocaleString('sr-RS')} RSD`;
