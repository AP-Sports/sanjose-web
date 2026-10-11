const SUPABASE_URL =
  "https://hedtfdvhqmdqwgujbtkv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_azpwmXD2ez3VwDRZHuOrvQ_v-4eFcwd";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


const form =
  document.querySelector("#login-form");

const emailInput =
  document.querySelector("#email");

const passwordInput =
  document.querySelector("#password");

const loginButton =
  document.querySelector("#login-button");

const message =
  document.querySelector("#message");


function showError(text) {

  message.textContent = text;
  message.className = "message error";

}


async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    window.location.href = "panel.html";
  }

}


form.addEventListener("submit", async event => {

  event.preventDefault();

  message.textContent = "";
  message.className = "message";

  loginButton.disabled = true;
  loginButton.textContent = "Iniciando sesión...";


  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;


  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    showError(
      "Correo o contraseña incorrectos."
    );

    loginButton.disabled = false;
    loginButton.textContent = "Iniciar sesión";

    return;
  }


  window.location.href = "panel.html";

});


checkSession();