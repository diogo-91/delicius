// Mascaras de entrada: removem tudo que nao for digito e aplicam o formato.
// O backend usa digits() nesses valores, entao o texto mascarado e aceito.

export function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
}

// (11) 99999-9999 ou (11) 9999-9999
export function maskPhone(value: string) {
  const d = onlyDigits(value, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// CPF 000.000.000-00 (ate 11 digitos) ou CNPJ 00.000.000/0000-00 (ate 14)
export function maskCpfCnpj(value: string) {
  const d = onlyDigits(value, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

// 00000-000
export function maskCep(value: string) {
  const d = onlyDigits(value, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// 0000 0000 0000 0000
export function maskCardNumber(value: string) {
  return onlyDigits(value, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

// MM/AA
export function maskExpiry(value: string) {
  const d = onlyDigits(value, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// Atributos HTML comuns para campos numericos (teclado numerico no celular)
export const numericInputProps = {
  inputMode: "numeric" as const,
  autoComplete: "off"
};

// Handlers para <input type="number">: o navegador aceita "e", "+" e "-".
// Bloqueamos essas teclas (e "." / "," nos campos inteiros).
type NumberKeyEvent = { key: string; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void };

export function decimalNumberKeyDown(event: NumberKeyEvent) {
  if (event.ctrlKey || event.metaKey) return;
  if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
}

export function integerNumberKeyDown(event: NumberKeyEvent) {
  if (event.ctrlKey || event.metaKey) return;
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault();
}
