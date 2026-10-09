const SUPABASE_URL =
  "https://hedtfdvhqmdqwgujbtkv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_azpwmXD2ez3VwDRZHuOrvQ_v-4eFcwd";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


const logoutButton =
  document.querySelector("#logout-button");

const form =
  document.querySelector("#list-form");

const nameInput =
  document.querySelector("#list-name");

const imageInput =
  document.querySelector("#list-image");

const previewContainer =
  document.querySelector("#preview-container");

const previewImage =
  document.querySelector("#preview-image");

const addButton =
  document.querySelector("#add-button");

const message =
  document.querySelector("#message");

const listsContainer =
  document.querySelector("#lists-container");

const listsMessage =
  document.querySelector("#lists-message");


/* =========================
   ELEMENTOS DEL MODAL EDITAR
   ========================= */

const editModal =
  document.querySelector("#edit-modal");

const editModalClose =
  document.querySelector("#edit-modal-close");

const editName =
  document.querySelector("#edit-name");

const editImage =
  document.querySelector("#edit-image");

const editPreview =
  document.querySelector("#edit-preview");

const editSave =
  document.querySelector("#edit-save");

const editCancel =
  document.querySelector("#edit-cancel");


let editingList = null;


/* =========================
   PDF.JS
   ========================= */

let pdfjsLib = null;


async function loadPdfJs() {

  if (pdfjsLib) {
    return pdfjsLib;
  }


  pdfjsLib =
    await import(
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
    );


  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


  return pdfjsLib;

}


/* =========================
   DETECTAR PDF
   ========================= */

function isPdfFile(file) {

  if (!file) {
    return false;
  }


  return (
    file.type === "application/pdf" ||
    file.name
      .toLowerCase()
      .endsWith(".pdf")
  );

}


function isPdfList(list) {

  if (!list) {
    return false;
  }


  if (list.tipo === "pdf") {
    return true;
  }


  return (
    typeof list.archivo === "string" &&
    list.archivo
      .toLowerCase()
      .split("?")[0]
      .endsWith(".pdf")
  );

}


/* =========================
   CREAR VISTA PREVIA PDF
   ========================= */

async function createPdfPreview(
  source
) {

  const pdf =
    await loadPdfJs();


  let pdfSource =
    source;


  if (source instanceof File) {

    pdfSource =
      new Uint8Array(
        await source.arrayBuffer()
      );

  }


  const loadingTask =
    pdf.getDocument(
      pdfSource
    );


  const documentPdf =
    await loadingTask.promise;


  const page =
    await documentPdf.getPage(1);


  const viewport =
    page.getViewport({
      scale: 1
    });


  const maxWidth =
    900;


  const scale =
    Math.min(
      maxWidth / viewport.width,
      2
    );


  const scaledViewport =
    page.getViewport({
      scale
    });


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    Math.ceil(
      scaledViewport.width
    );

  canvas.height =
    Math.ceil(
      scaledViewport.height
    );


  const context =
    canvas.getContext("2d");


  await page.render({
    canvasContext:
      context,

    viewport:
      scaledViewport
  }).promise;


  const imageData =
    canvas.toDataURL(
      "image/png"
    );


  await documentPdf.destroy();


  return imageData;

}


/* =========================
   MOSTRAR VISTA PREVIA
   ========================= */

async function showFilePreview(
  fileOrUrl,
  imageElement,
  loadingText = ""
) {

  if (!fileOrUrl) {
    return;
  }


  const pdf =
    fileOrUrl instanceof File
      ? isPdfFile(fileOrUrl)
      : typeof fileOrUrl === "string" &&
        fileOrUrl
          .toLowerCase()
          .split("?")[0]
          .endsWith(".pdf");


  if (!pdf) {

    if (fileOrUrl instanceof File) {

      imageElement.src =
        URL.createObjectURL(
          fileOrUrl
        );

    } else {

      imageElement.src =
        fileOrUrl;

    }

    return;
  }


  if (loadingText) {

    imageElement.alt =
      loadingText;

  }


  imageElement.src =
    "";


  try {

    const previewUrl =
      await createPdfPreview(
        fileOrUrl
      );


    imageElement.src =
      previewUrl;


  } catch (error) {

    console.error(
      "Error al generar la vista previa del PDF:",
      error
    );


    imageElement.src =
      "";


    imageElement.alt =
      "No se pudo mostrar la vista previa del PDF.";

  }

}


/* =========================
   SESIÓN
   ========================= */

async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {

    window.location.href =
      "index.html";

    return false;
  }

  return true;
}


/* =========================
   MENSAJES
   ========================= */

function showMessage(text, type) {

  message.textContent =
    text;

  message.className =
    `message ${type}`;

}


function showListsMessage(text, type) {

  listsMessage.textContent =
    text;

  listsMessage.className =
    `message ${type}`;

}


/* =========================
   PREVIEW AGREGAR
   ========================= */

imageInput.addEventListener(
  "change",
  async () => {

    const file =
      imageInput.files[0];


    if (!file) {

      previewContainer.hidden =
        true;

      previewImage.src =
        "";

      return;
    }


    previewContainer.hidden =
      false;


    if (isPdfFile(file)) {

      previewImage.alt =
        "Generando vista previa del PDF...";


      previewImage.src =
        "";


      await showFilePreview(
        file,
        previewImage,
        "Generando vista previa del PDF..."
      );


    } else {

      previewImage.alt =
        file.name;


      previewImage.src =
        URL.createObjectURL(
          file
        );

    }

  }
);


/* =========================
   CARGAR LISTAS
   ========================= */

async function loadLists() {

  listsContainer.innerHTML =
    "";

  showListsMessage(
    "Cargando listas...",
    ""
  );


  const {
    data,
    error
  } = await supabaseClient
    .from("listas")
    .select(
      "id, nombre, archivo, tipo"
    )
    .order(
      "id",
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      "Error al cargar las listas:",
      error
    );

    showListsMessage(
      "No se pudieron cargar las listas.",
      "error"
    );

    return;
  }


  if (!data || data.length === 0) {

    showListsMessage(
      "No hay listas cargadas.",
      ""
    );

    return;
  }


  showListsMessage(
    "",
    ""
  );


  data.forEach(
    list => {

      createListCard(
        list
      );

    }
  );

}


/* =========================
   CREAR TARJETA
   ========================= */

async function createListCard(list) {

  const card =
    document.createElement(
      "article"
    );

  card.className =
    "list-admin-card";


  const image =
    document.createElement(
      "img"
    );

  image.alt =
    list.nombre;


  if (isPdfList(list)) {

    image.alt =
      `${list.nombre} - primera página del PDF`;

    image.src =
      "";


    showFilePreview(
      list.archivo,
      image
    );


  } else {

    image.src =
      list.archivo;

  }


  const name =
    document.createElement(
      "h3"
    );

  name.textContent =
    list.nombre;


  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "list-admin-actions";


  /* =========================
     BOTÓN EDITAR
     ========================= */

  const editButton =
    document.createElement(
      "button"
    );

  editButton.type =
    "button";

  editButton.className =
    "edit-button";

  editButton.textContent =
    "Editar";


  editButton.addEventListener(
    "click",
    () => {

      openEditModal(
        list
      );

    }
  );


  /* =========================
     BOTÓN ELIMINAR
     ========================= */

  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.className =
    "delete-button";

  deleteButton.textContent =
    "Eliminar";


  deleteButton.addEventListener(
    "click",
    () => {

      confirmDelete(
        list
      );

    }
  );


  actions.appendChild(
    editButton
  );

  actions.appendChild(
    deleteButton
  );


  card.appendChild(
    image
  );

  card.appendChild(
    name
  );

  card.appendChild(
    actions
  );


  listsContainer.appendChild(
    card
  );

}


/* =========================
   CONFIRMACIÓN DE ELIMINACIÓN
   ========================= */

function confirmDelete(list) {

  const overlay =
    document.createElement(
      "div"
    );

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.zIndex =
    "2000";

  overlay.style.display =
    "flex";

  overlay.style.alignItems =
    "center";

  overlay.style.justifyContent =
    "center";

  overlay.style.padding =
    "20px";

  overlay.style.background =
    "rgba(0, 0, 0, 0.72)";


  const box =
    document.createElement(
      "div"
    );

  box.style.width =
    "100%";

  box.style.maxWidth =
    "420px";

  box.style.padding =
    "26px";

  box.style.background =
    "#ffffff";

  box.style.border =
    "1px solid #e2e5eb";

  box.style.borderRadius =
    "16px";

  box.style.boxShadow =
    "0 20px 60px rgba(0, 0, 0, 0.25)";


  const title =
    document.createElement(
      "h2"
    );

  title.textContent =
    "¿Eliminar esta lista?";

  title.style.margin =
    "0 0 8px";

  title.style.color =
    "#172033";

  title.style.fontSize =
    "1.3rem";


  const text =
    document.createElement(
      "p"
    );

  text.textContent =
    "Se eliminará de la lista";

  text.style.margin =
    "0 0 22px";

  text.style.color =
    "#687286";


  const actions =
    document.createElement(
      "div"
    );

  actions.style.display =
    "flex";

  actions.style.gap =
    "8px";


  const cancelButton =
    document.createElement(
      "button"
    );

  cancelButton.type =
    "button";

  cancelButton.textContent =
    "Cancelar";

  cancelButton.style.flex =
    "1";

  cancelButton.style.minHeight =
    "44px";

  cancelButton.style.padding =
    "8px 12px";

  cancelButton.style.border =
    "1px solid #e2e5eb";

  cancelButton.style.borderRadius =
    "9px";

  cancelButton.style.background =
    "#ffffff";

  cancelButton.style.color =
    "#172033";

  cancelButton.style.font =
    "inherit";

  cancelButton.style.fontWeight =
    "600";

  cancelButton.style.cursor =
    "pointer";


  const confirmButton =
    document.createElement(
      "button"
    );

  confirmButton.type =
    "button";

  confirmButton.textContent =
    "Eliminar";

  confirmButton.style.flex =
    "1";

  confirmButton.style.minHeight =
    "44px";

  confirmButton.style.padding =
    "8px 12px";

  confirmButton.style.border =
    "0";

  confirmButton.style.borderRadius =
    "9px";

  confirmButton.style.background =
    "#b42318";

  confirmButton.style.color =
    "#ffffff";

  confirmButton.style.font =
    "inherit";

  confirmButton.style.fontWeight =
    "600";

  confirmButton.style.cursor =
    "pointer";


  cancelButton.addEventListener(
    "click",
    () => {

      overlay.remove();

      document.body.style.overflow =
        "";

    }
  );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        overlay
      ) {

        overlay.remove();

        document.body.style.overflow =
          "";

      }

    }
  );


  confirmButton.addEventListener(
    "click",
    async () => {

      await deleteList(
        list,
        overlay,
        confirmButton,
        cancelButton
      );

    }
  );


  actions.appendChild(
    cancelButton
  );

  actions.appendChild(
    confirmButton
  );


  box.appendChild(
    title
  );

  box.appendChild(
    text
  );

  box.appendChild(
    actions
  );


  overlay.appendChild(
    box
  );


  document.body.appendChild(
    overlay
  );


  document.body.style.overflow =
    "hidden";


  cancelButton.focus();

}


/* =========================
   ELIMINAR LISTA
   ========================= */

async function deleteList(
  list,
  overlay,
  confirmButton,
  cancelButton
) {

  confirmButton.disabled =
    true;

  cancelButton.disabled =
    true;

  confirmButton.textContent =
    "Eliminando...";


  try {

    const {
      error: deleteError
    } = await supabaseClient
      .from("listas")
      .delete()
      .eq(
        "id",
        list.id
      );


    if (deleteError) {
      throw deleteError;
    }


    const fileName =
      getStorageFileName(
        list.archivo
      );


    if (fileName) {

      const {
        error: storageError
      } = await supabaseClient.storage
        .from("listas")
        .remove([
          fileName
        ]);


      if (storageError) {

        console.warn(
          "La lista fue eliminada, pero no se pudo eliminar el archivo del Storage:",
          storageError
        );

      }

    }


    overlay.remove();

    document.body.style.overflow =
      "";


    await loadLists();


    showMessage(
      "Lista eliminada correctamente.",
      "success"
    );


  } catch (error) {

    console.error(
      "Error al eliminar la lista:",
      error
    );


    confirmButton.disabled =
      false;

    cancelButton.disabled =
      false;

    confirmButton.textContent =
      "Eliminar";


    alert(
      "No se pudo eliminar la lista."
    );

  }

}


/* =========================
   ABRIR MODAL EDITAR
   ========================= */

async function openEditModal(list) {

  editingList =
    list;


  editName.value =
    list.nombre;

  editImage.value =
    "";


  editPreview.alt =
    list.nombre;


  editPreview.src =
    "";


  if (isPdfList(list)) {

    await showFilePreview(
      list.archivo,
      editPreview
    );

  } else {

    editPreview.src =
      list.archivo;

  }


  editSave.disabled =
    false;

  editCancel.disabled =
    false;

  editModalClose.disabled =
    false;

  editSave.textContent =
    "Guardar cambios";


  editModal.classList.add(
    "active"
  );

  editModal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";


  setTimeout(
    () => {

      editName.focus();

    },
    50
  );

}


/* =========================
   CERRAR MODAL EDITAR
   ========================= */

function closeEditModal() {

  editingList =
    null;

  editModal.classList.remove(
    "active"
  );

  editModal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";


  editName.value =
    "";

  editImage.value =
    "";

  editPreview.src =
    "";

  editModalClose.disabled =
    false;

}


/* =========================
   NUEVO ARCHIVO EN EDICIÓN
   ========================= */

editImage.addEventListener(
  "change",
  async () => {

    const file =
      editImage.files[0];


    if (!file) {

      if (editingList) {

        if (isPdfList(editingList)) {

          await showFilePreview(
            editingList.archivo,
            editPreview
          );

        } else {

          editPreview.src =
            editingList.archivo;

        }

      }

      return;
    }


    if (isPdfFile(file)) {

      editPreview.src =
        "";


      await showFilePreview(
        file,
        editPreview
      );

    } else {

      editPreview.src =
        URL.createObjectURL(
          file
        );

    }

  }
);


/* =========================
   CERRAR EDICIÓN
   ========================= */

editModalClose.addEventListener(
  "click",
  closeEditModal
);

editCancel.addEventListener(
  "click",
  closeEditModal
);


editModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      editModal
    ) {

      closeEditModal();

    }

  }
);


/* =========================
   ESC
   ========================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      editModal.classList.contains(
        "active"
      )
    ) {

      closeEditModal();

    }

  }
);


/* =========================
   GUARDAR EDICIÓN
   ========================= */

editSave.addEventListener(
  "click",
  async () => {

    if (!editingList) {
      return;
    }


    const newName =
      editName.value.trim();

    const newFile =
      editImage.files[0];


    if (!newName) {

      editName.focus();

      return;
    }


    editSave.disabled =
      true;

    editCancel.disabled =
      true;

    editModalClose.disabled =
      true;

    editSave.textContent =
      "Guardando...";


    try {

      let fileUrl =
        editingList.archivo;

      let fileType =
        editingList.tipo ||
        (
          isPdfList(editingList)
            ? "pdf"
            : "image"
        );


      if (newFile) {

        const extension =
          newFile.name
            .split(".")
            .pop()
            .toLowerCase();


        const newFileName =
          `${crypto.randomUUID()}.${extension}`;


        const {
          error: uploadError
        } = await supabaseClient.storage
          .from("listas")
          .upload(
            newFileName,
            newFile,
            {
              contentType:
                newFile.type,

              upsert:
                false
            }
          );


        if (uploadError) {
          throw uploadError;
        }


        const {
          data: publicUrlData
        } = supabaseClient.storage
          .from("listas")
          .getPublicUrl(
            newFileName
          );


        fileUrl =
          publicUrlData.publicUrl;


        fileType =
          isPdfFile(newFile)
            ? "pdf"
            : "image";


        const oldFileName =
          getStorageFileName(
            editingList.archivo
          );


        const {
          error: updateError
        } = await supabaseClient
          .from("listas")
          .update({
            nombre:
              newName,

            archivo:
              fileUrl,

            tipo:
              fileType
          })
          .eq(
            "id",
            editingList.id
          );


        if (updateError) {
          throw updateError;
        }


        if (oldFileName) {

          const {
            error: removeError
          } = await supabaseClient.storage
            .from("listas")
            .remove([
              oldFileName
            ]);


          if (removeError) {

            console.warn(
              "No se pudo eliminar el archivo anterior:",
              removeError
            );

          }

        }


      } else {

        const {
          error: updateError
        } = await supabaseClient
          .from("listas")
          .update({
            nombre:
              newName,

            tipo:
              fileType
          })
          .eq(
            "id",
            editingList.id
          );


        if (updateError) {
          throw updateError;
        }

      }


      closeEditModal();


      await loadLists();


      showMessage(
        "Lista actualizada correctamente.",
        "success"
      );


    } catch (error) {

      console.error(
        "Error al actualizar la lista:",
        error
      );


      editSave.disabled =
        false;

      editCancel.disabled =
        false;

      editModalClose.disabled =
        false;

      editSave.textContent =
        "Guardar cambios";


      alert(
        "No se pudo actualizar la lista."
      );

    }

  }
);


/* =========================
   OBTENER ARCHIVO STORAGE
   ========================= */

function getStorageFileName(url) {

  if (!url) {
    return null;
  }


  const marker =
    "/storage/v1/object/public/listas/";


  const position =
    url.indexOf(
      marker
    );


  if (position === -1) {
    return null;
  }


  return decodeURIComponent(
    url.substring(
      position + marker.length
    )
  );

}


/* =========================
   AGREGAR LISTA
   ========================= */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    showMessage(
      "",
      ""
    );


    addButton.disabled =
      true;

    addButton.textContent =
      "Subiendo...";


    const name =
      nameInput.value.trim();

    const file =
      imageInput.files[0];


    if (!name) {

      showMessage(
        "Ingresá un nombre para la lista.",
        "error"
      );


      addButton.disabled =
        false;

      addButton.textContent =
        "Agregar lista";

      return;
    }


    if (!file) {

      showMessage(
        "Seleccioná un archivo.",
        "error"
      );


      addButton.disabled =
        false;

      addButton.textContent =
        "Agregar lista";

      return;
    }


    if (
      !file.type.startsWith("image/") &&
      !isPdfFile(file)
    ) {

      showMessage(
        "El archivo debe ser una imagen o un PDF.",
        "error"
      );


      addButton.disabled =
        false;

      addButton.textContent =
        "Agregar lista";

      return;
    }


    try {

      const extension =
        file.name
          .split(".")
          .pop()
          .toLowerCase();


      const fileName =
        `${crypto.randomUUID()}.${extension}`;


      const {
        error: uploadError
      } = await supabaseClient.storage
        .from("listas")
        .upload(
          fileName,
          file,
          {
            contentType:
              file.type,

            upsert:
              false
          }
        );


      if (uploadError) {
        throw uploadError;
      }


      const {
        data: publicUrlData
      } = supabaseClient.storage
        .from("listas")
        .getPublicUrl(
          fileName
        );


      const fileUrl =
        publicUrlData.publicUrl;


      const fileType =
        isPdfFile(file)
          ? "pdf"
          : "image";


      const {
        error: insertError
      } = await supabaseClient
        .from("listas")
        .insert({
          nombre:
            name,

          archivo:
            fileUrl,

          tipo:
            fileType
        });


      if (insertError) {
        throw insertError;
      }


      showMessage(
        "Lista agregada correctamente.",
        "success"
      );


      form.reset();


      previewContainer.hidden =
        true;

      previewImage.src =
        "";


      await loadLists();


    } catch (error) {

      console.error(
        "Error al agregar la lista:",
        error
      );


      showMessage(
        "No se pudo agregar la lista.",
        "error"
      );

    }


    addButton.disabled =
      false;

    addButton.textContent =
      "Agregar lista";

  }
);


/* =========================
   CERRAR SESIÓN
   ========================= */

logoutButton.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

    window.location.href =
      "index.html";

  }
);


/* =========================
   INICIAR PANEL
   ========================= */

async function startPanel() {

  const authenticated =
    await checkSession();


  if (!authenticated) {
    return;
  }


  await loadLists();

}


startPanel();