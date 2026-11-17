import assert from "node:assert/strict";
import test from "node:test";
import { validateAdminCredentialsInput } from "./adminUsers.js";

test("e-mail válido é normalizado e senha curta é recusada", () => {
  const ok = validateAdminCredentialsInput({
    email: "  Pessoa@Exemplo.com ",
    newPassword: "",
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.payload, { email: "pessoa@exemplo.com" });

  const bad = validateAdminCredentialsInput({
    email: "",
    newPassword: "123",
  });
  assert.equal(bad.valid, false);
});

test("e-mail inválido e ausência de alteração são recusados", () => {
  assert.equal(
    validateAdminCredentialsInput({ email: "sem-arroba", newPassword: "" })
      .valid,
    false,
  );
  const empty = validateAdminCredentialsInput({ email: "", newPassword: "" });
  assert.equal(empty.valid, false);
  assert.deepEqual(empty.payload, {});
});

test("senha válida sozinha monta o payload sem e-mail", () => {
  const result = validateAdminCredentialsInput({
    email: "",
    newPassword: "segredo1",
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.payload, { password: "segredo1" });
});
