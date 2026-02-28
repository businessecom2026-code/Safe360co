// Safe360 Email Templates — Beautiful HTML emails
// All templates follow a consistent brand look

const BRAND_COLOR = '#2563EB';
const BRAND_DARK = '#1E40AF';
const GRAY_TEXT = '#64748B';
const BG_COLOR = '#F8FAFC';

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Safe360</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG_COLOR};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});padding:32px 32px 24px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:24px;">
                &#128737;
              </div>
              <h1 style="margin:12px 0 0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Safe360</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">by Ecom360.co</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#F1F5F9;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;color:#94A3B8;font-size:11px;">
                &copy; ${new Date().getFullYear()} Safe360 &mdash; Ecom360.co<br/>
                Protecao digital 360&deg; com criptografia de ponta a ponta.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(text: string, url: string, color: string = BRAND_COLOR): string {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;">
    <tr>
      <td style="background:${color};border-radius:12px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── Invite Guest Email ───
export function inviteGuestEmail(params: {
  guestEmail: string;
  adminEmail: string;
  inviteLink: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;font-weight:700;">Voce foi convidado!</h2>
    <p style="margin:0 0 20px;color:${GRAY_TEXT};font-size:14px;line-height:1.6;">
      <strong>${params.adminEmail}</strong> convidou voce para acessar o cofre digital Safe360.
    </p>

    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#0369A1;font-size:13px;">
        &#128274; Ao acessar, voce criara um PIN seguro de 4 a 8 digitos para proteger sua conta.
      </p>
    </div>

    ${buttonHtml('Ativar Minha Conta', params.inviteLink)}

    <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
      Se o botao nao funcionar, copie e cole este link no navegador:<br/>
      <a href="${params.inviteLink}" style="color:${BRAND_COLOR};word-break:break-all;">${params.inviteLink}</a>
    </p>
  `;

  return {
    subject: `${params.adminEmail} convidou voce para o Safe360`,
    html: baseLayout(content),
  };
}

// ─── Password Reset Email ───
export function passwordResetEmail(params: {
  email: string;
  resetLink: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;font-weight:700;">Redefinir Senha</h2>
    <p style="margin:0 0 20px;color:${GRAY_TEXT};font-size:14px;line-height:1.6;">
      Recebemos uma solicitacao para redefinir a senha da conta <strong>${params.email}</strong>.
    </p>

    <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#C2410C;font-size:13px;">
        &#9888;&#65039; Este link expira em <strong>30 minutos</strong>. Se voce nao solicitou esta alteracao, ignore este email.
      </p>
    </div>

    ${buttonHtml('Redefinir Minha Senha', params.resetLink, '#D97706')}

    <p style="margin:0;color:#94A3B8;font-size:12px;text-align:center;">
      Se o botao nao funcionar, copie e cole este link:<br/>
      <a href="${params.resetLink}" style="color:${BRAND_COLOR};word-break:break-all;">${params.resetLink}</a>
    </p>
  `;

  return {
    subject: 'Redefinicao de senha — Safe360',
    html: baseLayout(content),
  };
}

// ─── Welcome Email (after registration) ───
export function welcomeEmail(params: {
  email: string;
  loginLink: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;font-weight:700;">Bem-vindo ao Safe360! &#127881;</h2>
    <p style="margin:0 0 20px;color:${GRAY_TEXT};font-size:14px;line-height:1.6;">
      Sua conta <strong>${params.email}</strong> foi criada com sucesso. Voce ja pode comecar a proteger seus dados.
    </p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;">O que voce pode fazer:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#166534;font-size:13px;line-height:1.8;">
        <li>Criar cofres seguros para suas senhas</li>
        <li>Armazenar documentos confidenciais</li>
        <li>Convidar usuarios de confianca</li>
        <li>Exportar backups criptografados</li>
      </ul>
    </div>

    ${buttonHtml('Acessar Safe360', params.loginLink)}
  `;

  return {
    subject: 'Bem-vindo ao Safe360 — Sua protecao digital comeca agora',
    html: baseLayout(content),
  };
}

// ─── Guest Activated Notification (to admin) ───
export function guestActivatedEmail(params: {
  adminEmail: string;
  guestEmail: string;
  dashboardLink: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;font-weight:700;">Convidado Ativado &#9989;</h2>
    <p style="margin:0 0 20px;color:${GRAY_TEXT};font-size:14px;line-height:1.6;">
      O usuario <strong>${params.guestEmail}</strong> aceitou seu convite e ativou a conta no Safe360.
    </p>

    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#0369A1;font-size:13px;">
        &#128100; O convidado agora tem acesso ao sistema. Voce pode gerenciar permissoes no Dashboard.
      </p>
    </div>

    ${buttonHtml('Ver no Dashboard', params.dashboardLink)}
  `;

  return {
    subject: `${params.guestEmail} ativou a conta no Safe360`,
    html: baseLayout(content),
  };
}

// ─── Support Contact Email ───
export function supportContactEmail(params: {
  name: string;
  email: string;
  message: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin:0 0 8px;color:#0F172A;font-size:20px;font-weight:700;">Nova Mensagem de Suporte</h2>
    <p style="margin:0 0 20px;color:${GRAY_TEXT};font-size:14px;line-height:1.6;">
      Uma nova mensagem foi recebida pelo formulario de suporte.
    </p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin-bottom:20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
        <tr>
          <td style="padding:4px 0;color:#64748B;font-size:13px;width:80px;vertical-align:top;">Nome:</td>
          <td style="padding:4px 0;color:#0F172A;font-size:13px;font-weight:600;">${params.name}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#64748B;font-size:13px;vertical-align:top;">Email:</td>
          <td style="padding:4px 0;color:#0F172A;font-size:13px;font-weight:600;">
            <a href="mailto:${params.email}" style="color:${BRAND_COLOR};">${params.email}</a>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:16px;">
      <p style="margin:0 0 8px;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Mensagem:</p>
      <p style="margin:0;color:#0F172A;font-size:14px;line-height:1.6;white-space:pre-wrap;">${params.message}</p>
    </div>
  `;

  return {
    subject: `[Suporte Safe360] Mensagem de ${params.name}`,
    html: baseLayout(content),
  };
}
