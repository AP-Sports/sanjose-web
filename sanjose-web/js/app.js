const SUPABASE_URL =
  "https://hedtfdvhqmdqwgujbtkv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_azpwmXD2ez3VwDRZHuOrvQ_v-4eFcwd";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


let lists = [];


const grid =
  document.querySelector("#list-grid");


const search =
  document.querySelector("#search");


const emptyState =
  document.querySelector("#empty-state");


const modal =
  document.querySelector("#image-modal");


const modalContent =
  document.querySelector(".modal-content");


const modalImage =
  document.querySelector("#modal-image");


const modalClose =
  document.querySelector("#modal-close");


/* =========================
   ZOOM DE IMÁGENES
   ========================= */

let scale = 1;

let translateX = 0;

let translateY = 0;

let isDragging = false;

let startX = 0;

let startY = 0;

let initialDistance = 0;

let initialScale = 1;

let initialMidX = 0;

let initialMidY = 0;

let initialTranslateX = 0;

let initialTranslateY = 0;

let lastTap = 0;

let animationTimeout = null;


/* =========================
   ZOOM DE PDF
   ========================= */

let pdfZoomLayer = null;

let pdfScale = 1;

let pdfTranslateX = 0;

let pdfTranslateY = 0;

let pdfInitialDistance = 0;

let pdfInitialScale = 1;

let pdfInitialMidX = 0;

let pdfInitialMidY = 0;

let pdfInitialContentX = 0;

let pdfInitialContentY = 0;

let pdfInitialTranslateX = 0;

let pdfInitialTranslateY = 0;

let pdfIsDragging = false;

let pdfStartX = 0;

let pdfStartY = 0;

let pdfLastTap = 0;

let pdfAnimationTimeout = null;


let pdfjsLib = null;


/* =========================
   CACHÉ DE VISTAS PREVIAS
   ========================= */

const previewCache =
  new Map();


/* =========================
   CARGAR PDF.JS
   ========================= */

async function loadPdfJs() {

  if (pdfjsLib) {
    return pdfjsLib;
  }

  pdfjsLib = await import(
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
  );

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

  return pdfjsLib;
}


/* =========================
   DETECTAR PDF
   ========================= */

function isPdfList(list) {

  if (!list) {
    return false;
  }

  if (list.type === "pdf") {
    return true;
  }

  return (
    typeof list.file === "string" &&
    list.file
      .toLowerCase()
      .split("?")[0]
      .endsWith(".pdf")
  );
}


/* =========================
   OBTENER DATOS DEL PDF
   ========================= */

async function getPdfData(source) {

  let data;

  if (source instanceof File) {

    data =
      new Uint8Array(
        await source.arrayBuffer()
      );

  } else if (
    typeof source === "string"
  ) {

    const response =
      await fetch(source);

    if (!response.ok) {

      throw new Error(
        `No se pudo descargar el PDF. HTTP ${response.status}`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    data =
      new Uint8Array(
        arrayBuffer
      );

  } else {

    data = source;
  }

  return data;
}


/* =========================
   CONVERTIR PRIMERA PÁGINA
   A IMAGEN PARA LA MINIATURA
   ========================= */

async function pdfToImage(source) {

  const pdfjs =
    await loadPdfJs();

  const data =
    await getPdfData(source);

  const pdf =
    await pdfjs.getDocument({
      data
    }).promise;

  const page =
    await pdf.getPage(1);

  const baseViewport =
    page.getViewport({
      scale: 1
    });

  const maxWidth = 1200;
  const maxHeight = 1600;

  const widthScale =
    maxWidth /
    baseViewport.width;

  const heightScale =
    maxHeight /
    baseViewport.height;

  const renderScale =
    Math.min(
      widthScale,
      heightScale
    ) * 2;

  const viewport =
    page.getViewport({
      scale: renderScale
    });

  const canvas =
    document.createElement(
      "canvas"
    );

  const context =
    canvas.getContext("2d");

  canvas.width =
    Math.ceil(
      viewport.width
    );

  canvas.height =
    Math.ceil(
      viewport.height
    );

  await page.render({
    canvasContext: context,
    viewport
  }).promise;

  return canvas.toDataURL(
    "image/png"
  );
}


/* =========================
   OBTENER MINIATURA
   ========================= */

async function getListPreview(list) {

  if (!isPdfList(list)) {
    return list.file;
  }

  if (
    previewCache.has(list.file)
  ) {

    return previewCache.get(
      list.file
    );
  }

  try {

    const preview =
      await pdfToImage(
        list.file
      );

    previewCache.set(
      list.file,
      preview
    );

    return preview;

  } catch (error) {

    console.error(
      "Error al generar la vista previa del PDF:",
      error
    );

    return "";
  }
}


/* =========================
   FIRMA DE LAS LISTAS
   ========================= */

function getListsSignature(data) {

  return JSON.stringify(
    data.map(list => ({

      id:
        list.id,

      nombre:
        list.nombre,

      archivo:
        list.archivo,

      tipo:
        list.tipo

    }))
  );
}


/* =========================
   LISTAS
   ========================= */

async function renderLists() {

  const query =
    search.value
      .trim()
      .toLocaleLowerCase("es");

  const filtered =
    lists.filter(list =>
      list.name
        .toLocaleLowerCase("es")
        .includes(query)
    );

  grid.innerHTML =
    "";

  emptyState.hidden =
    filtered.length !== 0;

  for (
    const list of filtered
  ) {

    const card =
      document.createElement(
        "button"
      );

    card.className =
      "list-card";

    card.type =
      "button";

    card.dataset.file =
      list.file;

    card.dataset.name =
      list.name;

    const preview =
      document.createElement(
        "div"
      );

    preview.className =
      "preview";

    const image =
      document.createElement(
        "img"
      );

    image.alt =
      `Vista previa de ${list.name}`;

    preview.appendChild(
      image
    );

    const title =
      document.createElement(
        "div"
      );

    title.className =
      "card-title";

    title.textContent =
      list.name;

    card.appendChild(
      preview
    );

    card.appendChild(
      title
    );

    grid.appendChild(
      card
    );

    const previewImage =
      await getListPreview(
        list
      );

    if (previewImage) {

      image.src =
        previewImage;
    }

    card.addEventListener(
      "click",
      () => {

        openModal(
          list.file,
          list.name,
          list.type
        );

      }
    );

  }
}


/* =========================
   LIMITAR DESPLAZAMIENTO
   DE IMAGEN
   ========================= */

function clampPosition() {

  if (
    !modalImage.complete ||
    !modalImage.naturalWidth
  ) {

    return;
  }

  const oldTransform =
    modalImage.style.transform;

  modalImage.style.transform =
    "translate(0px, 0px) scale(1)";

  const imageRect =
    modalImage.getBoundingClientRect();

  const viewportRect =
    modalContent.getBoundingClientRect();

  const baseWidth =
    imageRect.width;

  const baseHeight =
    imageRect.height;

  modalImage.style.transform =
    oldTransform;

  const scaledWidth =
    baseWidth * scale;

  const scaledHeight =
    baseHeight * scale;

  const viewportWidth =
    viewportRect.width;

  const viewportHeight =
    viewportRect.height;

  if (
    scaledWidth <= viewportWidth
  ) {

    translateX =
      0;

  } else {

    const maxX =
      (scaledWidth - viewportWidth) / 2;

    translateX =
      Math.max(
        -maxX,
        Math.min(
          maxX,
          translateX
        )
      );
  }

  if (
    scaledHeight <= viewportHeight
  ) {

    translateY =
      0;

  } else {

    const maxY =
      (scaledHeight - viewportHeight) / 2;

    translateY =
      Math.max(
        -maxY,
        Math.min(
          maxY,
          translateY
        )
      );
  }
}


/* =========================
   ACTUALIZAR TRANSFORM
   DE IMAGEN
   ========================= */

function updateImageTransform() {

  scale =
    Math.max(
      1,
      Math.min(
        scale,
        15
      )
    );

  if (scale === 1) {

    translateX =
      0;

    translateY =
      0;
  }

  clampPosition();

  modalImage.style.transform =
    `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}


/* =========================
   ZOOM DE IMAGEN DESDE PUNTO
   ========================= */

function zoomAtPoint(
  newScale,
  pointX,
  pointY
) {

  newScale =
    Math.max(
      1,
      Math.min(
        newScale,
        15
      )
    );

  const oldScale =
    scale;

  if (
    oldScale === newScale
  ) {

    return;
  }

  if (
    !modalImage.complete ||
    !modalImage.naturalWidth
  ) {

    scale =
      newScale;

    updateImageTransform();

    return;
  }

  const rect =
    modalImage.getBoundingClientRect();

  const imageCenterX =
    rect.left +
    rect.width / 2;

  const imageCenterY =
    rect.top +
    rect.height / 2;

  const offsetX =
    pointX -
    imageCenterX;

  const offsetY =
    pointY -
    imageCenterY;

  const scaleRatio =
    newScale /
    oldScale;

  translateX +=
    offsetX *
    (
      1 -
      scaleRatio
    );

  translateY +=
    offsetY *
    (
      1 -
      scaleRatio
    );

  scale =
    newScale;

  updateImageTransform();
}


/* =========================
   RESET DE IMAGEN
   ========================= */

function resetZoom() {

  scale =
    1;

  translateX =
    0;

  translateY =
    0;

  modalImage.style.transition =
    "none";

  updateImageTransform();
}


/* =========================
   RESET DE PDF
   ========================= */

function resetPdfZoom() {

  pdfScale =
    1;

  pdfTranslateX =
    0;

  pdfTranslateY =
    0;

  pdfInitialDistance =
    0;

  pdfIsDragging =
    false;

  if (!pdfZoomLayer) {
    return;
  }

  modalContent.style.overflowY =
    "auto";

  modalContent.style.overflowX =
    "auto";

  modalContent.style.touchAction =
    "pan-y";

  pdfZoomLayer.style.touchAction =
    "pan-y";

  pdfZoomLayer.style.transition =
    "none";

  pdfZoomLayer.style.transform =
    "translate(0px, 0px) scale(1)";
}


/* =========================
   LIMITAR DESPLAZAMIENTO
   DEL PDF
   ========================= */

function clampPdfPosition() {

  if (!pdfZoomLayer) {
    return;
  }

  const viewportWidth =
    modalContent.clientWidth;

  const viewportHeight =
    modalContent.clientHeight;

  const layerWidth =
    pdfZoomLayer.offsetWidth;

  const layerHeight =
    pdfZoomLayer.offsetHeight;

  const scaledWidth =
    layerWidth * pdfScale;

  const scaledHeight =
    layerHeight * pdfScale;

  const maxX =
    Math.max(
      0,
      scaledWidth - viewportWidth
    );

  const maxY =
    Math.max(
      0,
      scaledHeight - viewportHeight
    );

  pdfTranslateX =
    Math.max(
      -maxX,
      Math.min(
        0,
        pdfTranslateX
      )
    );

  pdfTranslateY =
    Math.max(
      -maxY,
      Math.min(
        0,
        pdfTranslateY
      )
    );
}


/* =========================
   ACTUALIZAR TRANSFORM
   DEL PDF
   ========================= */

function updatePdfTransform() {

  if (!pdfZoomLayer) {
    return;
  }

  pdfScale =
    Math.max(
      1,
      Math.min(
        pdfScale,
        15
      )
    );

  if (pdfScale === 1) {

    pdfTranslateX =
      0;

    pdfTranslateY =
      0;

    modalContent.style.overflowY =
      "auto";

    modalContent.style.overflowX =
      "hidden";

    modalContent.style.touchAction =
      "pan-y";

    pdfZoomLayer.style.touchAction =
      "pan-y";

  } else {

    modalContent.style.overflow =
      "hidden";

    modalContent.style.touchAction =
      "none";

    pdfZoomLayer.style.touchAction =
      "none";
  }

  clampPdfPosition();

  pdfZoomLayer.style.transform =
    `translate(${pdfTranslateX}px, ${pdfTranslateY}px) scale(${pdfScale})`;
}


/* =========================
   ZOOM DEL PDF DESDE UN PUNTO
   ========================= */

function zoomPdfAtPoint(
  newScale,
  pointX,
  pointY
) {

  if (!pdfZoomLayer) {
    return;
  }

  newScale =
    Math.max(
      1,
      Math.min(
        newScale,
        15
      )
    );

  const oldScale =
    pdfScale;

  if (
    oldScale === newScale
  ) {
    return;
  }

  const rect =
    modalContent.getBoundingClientRect();

  const localX =
    pointX -
    rect.left;

  const localY =
    pointY -
    rect.top;

  const oldScrollTop =
    modalContent.scrollTop;

  const contentX =
    (
      localX -
      pdfTranslateX
    ) /
    oldScale;

  const contentY =
    (
      localY +
      oldScrollTop -
      pdfTranslateY
    ) /
    oldScale;

  pdfScale =
    newScale;

  if (newScale > 1) {

    modalContent.style.overflow =
      "hidden";

    modalContent.scrollTop =
      0;

    pdfTranslateX =
      localX -
      contentX *
      newScale;

    pdfTranslateY =
      localY -
      contentY *
      newScale;

  } else {

    pdfTranslateX =
      0;

    pdfTranslateY =
      0;

    const newScrollTop =
      Math.max(
        0,
        contentY
      );

    updatePdfTransform();

    modalContent.scrollTop =
      Math.min(
        newScrollTop,
        Math.max(
          0,
          pdfZoomLayer.offsetHeight -
          modalContent.clientHeight
        )
      );

    return;
  }

  updatePdfTransform();
}


/* =========================
   RENDERIZAR TODAS LAS
   PÁGINAS DEL PDF
   ========================= */

async function renderPdfPages(
  source
) {

  const pdfjs =
    await loadPdfJs();

  const data =
    await getPdfData(source);

  const pdf =
    await pdfjs.getDocument({
      data
    }).promise;

  const layer =
    document.createElement(
      "div"
    );

  layer.className =
    "pdf-zoom-layer";

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    const page =
      await pdf.getPage(
        pageNumber
      );

    const baseViewport =
      page.getViewport({
        scale: 1
      });

    const availableWidth =
      Math.min(
        modalContent.clientWidth,
        1200
      );

    const renderScale =
      Math.min(
        availableWidth /
          baseViewport.width,
        2
      );

    /*
     * En celulares, PDF.js debe renderizar
     * usando la densidad real de píxeles
     * de la pantalla.
     *
     * El tamaño visual NO cambia.
     * Solamente aumenta la resolución
     * interna del canvas.
     */

    const devicePixelRatio =
      Math.min(
        window.devicePixelRatio || 1,
        3
      );

    const viewport =
      page.getViewport({
        scale: renderScale
      });

    const renderViewport =
      page.getViewport({
        scale:
          renderScale *
          devicePixelRatio
      });

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.className =
      "pdf-page";

    canvas.width =
      Math.ceil(
        renderViewport.width
      );

    canvas.height =
      Math.ceil(
        renderViewport.height
      );

    canvas.style.width =
      `${viewport.width}px`;

    canvas.style.height =
      `${viewport.height}px`;

    const context =
      canvas.getContext(
        "2d"
      );

    await page.render({
      canvasContext:
        context,
      viewport:
        renderViewport
    }).promise;

    layer.appendChild(
      canvas
    );
  }

  modalContent.appendChild(
    layer
  );

  pdfZoomLayer =
    layer;

  pdfScale =
    1;

  pdfTranslateX =
    0;

  pdfTranslateY =
    0;

  modalContent.scrollTop =
    0;

  updatePdfTransform();
}


/* =========================
   ABRIR MODAL
   ========================= */

async function openModal(
  file,
  name,
  type
) {

  modalImage.alt =
    name;

  resetZoom();

  resetPdfZoom();

  modalContent.classList.remove(
    "pdf-mode"
  );

  modalContent.scrollTop =
    0;

  modalContent
    .querySelectorAll(".pdf-zoom-layer")
    .forEach(layer => layer.remove());

  pdfZoomLayer =
    null;

  modalImage.style.display =
    "block";

  modal.classList.add(
    "active"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";

  const isPdf =
    type === "pdf" ||
    (
      typeof file === "string" &&
      file
        .toLowerCase()
        .split("?")[0]
        .endsWith(".pdf")
    );

  if (isPdf) {

    modalImage.style.display =
      "none";

    modalContent.classList.add(
      "pdf-mode"
    );

    try {

      await renderPdfPages(
        file
      );

    } catch (error) {

      console.error(
        "Error al abrir el PDF:",
        error
      );

      closeModal();
    }

  } else {

    modalImage.src =
      file;
  }
}


/* =========================
   CERRAR MODAL
   ========================= */

function closeModal() {

  modal.classList.remove(
    "active"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  modalImage.src =
    "";

  modalImage.style.display =
    "block";

  modalContent.classList.remove(
    "pdf-mode"
  );

  modalContent
    .querySelectorAll(".pdf-zoom-layer")
    .forEach(layer => layer.remove());

  pdfZoomLayer =
    null;

  resetZoom();

  resetPdfZoom();

  document.body.style.overflow =
    "";
}


modalClose.addEventListener(
  "click",
  closeModal
);


modal.addEventListener(
  "click",
  event => {

    if (
      event.target === modal
    ) {

      closeModal();
    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeModal();
    }

  }
);


/* =========================
   RUEDA DEL MOUSE - IMAGEN
   ========================= */

modalImage.addEventListener(
  "wheel",
  event => {

    event.preventDefault();

    modalImage.style.transition =
      "none";

    const zoomAmount =
      event.deltaY < 0
        ? 0.15
        : -0.15;

    const newScale =
      scale +
      zoomAmount;

    zoomAtPoint(
      newScale,
      event.clientX,
      event.clientY
    );

  },
  {
    passive: false
  }
);


/* =========================
   RUEDA DEL MOUSE - PDF
   ========================= */

modalContent.addEventListener(
  "wheel",
  event => {

    if (
      !modalContent.classList.contains(
        "pdf-mode"
      ) ||
      !pdfZoomLayer
    ) {

      return;
    }

    event.preventDefault();

    pdfZoomLayer.style.transition =
      "none";

    const zoomAmount =
      event.deltaY < 0
        ? 0.15
        : -0.15;

    const newScale =
      pdfScale +
      zoomAmount;

    zoomPdfAtPoint(
      newScale,
      event.clientX,
      event.clientY
    );

  },
  {
    passive: false
  }
);


/* =========================
   DISTANCIA ENTRE DOS DEDOS
   ========================= */

function getDistance(
  touch1,
  touch2
) {

  const dx =
    touch1.clientX -
    touch2.clientX;

  const dy =
    touch1.clientY -
    touch2.clientY;

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


/* =========================
   PUNTO MEDIO
   ========================= */

function getMidpoint(
  touch1,
  touch2
) {

  return {

    x:
      (
        touch1.clientX +
        touch2.clientX
      ) / 2,

    y:
      (
        touch1.clientY +
        touch2.clientY
      ) / 2

  };
}


/* =========================
   TOUCH START - IMAGEN
   ========================= */

modalImage.addEventListener(
  "touchstart",
  event => {

    if (animationTimeout) {

      clearTimeout(
        animationTimeout
      );

      animationTimeout =
        null;
    }

    modalImage.style.transition =
      "none";

    if (
      event.touches.length === 2
    ) {

      event.preventDefault();

      initialDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );

      initialScale =
        scale;

      initialTranslateX =
        translateX;

      initialTranslateY =
        translateY;

      const midpoint =
        getMidpoint(
          event.touches[0],
          event.touches[1]
        );

      initialMidX =
        midpoint.x;

      initialMidY =
        midpoint.y;

      isDragging =
        false;

      return;
    }

    if (
      event.touches.length === 1 &&
      scale > 1
    ) {

      isDragging =
        true;

      startX =
        event.touches[0].clientX -
        translateX;

      startY =
        event.touches[0].clientY -
        translateY;
    }

  },
  {
    passive: false
  }
);


/* =========================
   TOUCH MOVE - IMAGEN
   ========================= */

modalImage.addEventListener(
  "touchmove",
  event => {

    if (
      event.touches.length === 2
    ) {

      event.preventDefault();

      const currentDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );

      if (
        initialDistance === 0
      ) {

        return;
      }

      let newScale =
        initialScale *
        (
          currentDistance /
          initialDistance
        );

      newScale =
        Math.max(
          1,
          Math.min(
            newScale,
            15
          )
        );

      const midpoint =
        getMidpoint(
          event.touches[0],
          event.touches[1]
        );

      /*
       * Calculamos el centro REAL de la imagen
       * sin la traslación actual.
       *
       * Esto permite saber exactamente qué punto
       * de la imagen estaba debajo del centro
       * de los dedos al comenzar el pinch.
       */

      const currentRect =
        modalImage.getBoundingClientRect();

      const baseCenterX =
        currentRect.left +
        currentRect.width / 2 -
        initialTranslateX;

      const baseCenterY =
        currentRect.top +
        currentRect.height / 2 -
        initialTranslateY;

      /*
       * Punto de la imagen que estaba debajo
       * del centro de los dedos al iniciar.
       *
       * Se guarda en coordenadas relativas
       * al centro de la imagen.
       */

      const contentX =
        (
          initialMidX -
          baseCenterX -
          initialTranslateX
        ) /
        initialScale;

      const contentY =
        (
          initialMidY -
          baseCenterY -
          initialTranslateY
        ) /
        initialScale;

      /*
       * Ahora colocamos ese MISMO punto debajo
       * del nuevo centro de los dedos.
       *
       * De esta manera:
       *
       * - si acercás los dedos, amplía desde ese punto;
       * - si alejás los dedos, reduce desde ese punto;
       * - si movés ambas manos mientras hacés pinch,
       *   la imagen acompaña el movimiento;
       * - el contenido no "salta" hacia otro lugar.
       */

      translateX =
        midpoint.x -
        baseCenterX -
        contentX *
        newScale;

      translateY =
        midpoint.y -
        baseCenterY -
        contentY *
        newScale;

      scale =
        newScale;

      updateImageTransform();

      return;
    }

    if (
      event.touches.length === 1 &&
      isDragging &&
      scale > 1
    ) {

      event.preventDefault();

      translateX =
        event.touches[0].clientX -
        startX;

      translateY =
        event.touches[0].clientY -
        startY;

      modalImage.style.transition =
        "none";

      updateImageTransform();
    }

  },
  {
    passive: false
  }
);


/* =========================
   TOUCH END - IMAGEN
   ========================= */

modalImage.addEventListener(
  "touchend",
  event => {

    if (
      event.touches.length < 2
    ) {

      initialDistance =
        0;
    }

    if (
      event.touches.length === 0
    ) {

      isDragging =
        false;

      modalImage.style.transition =
        "none";

      updateImageTransform();
    }

  }
);


/* =========================
   DOBLE TOQUE - IMAGEN
   ========================= */

modalImage.addEventListener(
  "touchend",
  event => {

    if (
      event.touches.length !== 0
    ) {

      return;
    }

    const now =
      Date.now();

    if (
      now - lastTap < 300
    ) {

      if (animationTimeout) {

        clearTimeout(
          animationTimeout
        );

        animationTimeout =
          null;
      }

      const touch =
        event.changedTouches[0];

      if (!touch) {

        lastTap =
          now;

        return;
      }

      if (
        scale === 1
      ) {

        modalImage.style.transition =
          "transform 0.25s ease";

        void modalImage.offsetWidth;

        zoomAtPoint(
          2.5,
          touch.clientX,
          touch.clientY
        );

      } else {

        modalImage.style.transition =
          "transform 0.25s ease";

        void modalImage.offsetWidth;

        scale =
          1;

        translateX =
          0;

        translateY =
          0;

        modalImage.style.transform =
          "translate(0px, 0px) scale(1)";
      }

      animationTimeout =
        setTimeout(
          () => {

            modalImage.style.transition =
              "none";

            updateImageTransform();

            animationTimeout =
              null;

          },
          250
        );
    }

    lastTap =
      now;

  }
);


/* =========================
   TOUCH START - PDF
   ========================= */

modalContent.addEventListener(
  "touchstart",
  event => {

    if (
      !modalContent.classList.contains(
        "pdf-mode"
      ) ||
      !pdfZoomLayer
    ) {

      return;
    }

    if (pdfAnimationTimeout) {

      clearTimeout(
        pdfAnimationTimeout
      );

      pdfAnimationTimeout =
        null;
    }

    pdfZoomLayer.style.transition =
      "none";

    if (
      event.touches.length === 2
    ) {

      event.preventDefault();

      pdfInitialDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );

      pdfInitialScale =
        pdfScale;

      pdfInitialTranslateX =
        pdfTranslateX;

      pdfInitialTranslateY =
        pdfTranslateY;

      const midpoint =
        getMidpoint(
          event.touches[0],
          event.touches[1]
        );

      pdfInitialMidX =
        midpoint.x;

      pdfInitialMidY =
        midpoint.y;

      const rect =
        modalContent.getBoundingClientRect();

      const localX =
        midpoint.x -
        rect.left;

      const localY =
        midpoint.y -
        rect.top;

      const scrollTop =
        modalContent.scrollTop;

      pdfInitialContentX =
        (
          localX -
          pdfTranslateX
        ) /
        pdfScale;

      pdfInitialContentY =
        (
          localY +
          scrollTop -
          pdfTranslateY
        ) /
        pdfScale;

      pdfIsDragging =
        false;

      return;
    }

    if (
      event.touches.length === 1 &&
      pdfScale > 1
    ) {

      event.preventDefault();

      pdfIsDragging =
        true;

      pdfStartX =
        event.touches[0].clientX -
        pdfTranslateX;

      pdfStartY =
        event.touches[0].clientY -
        pdfTranslateY;
    }

  },
  {
    passive: false
  }
);


/* =========================
   TOUCH MOVE - PDF
   ========================= */

modalContent.addEventListener(
  "touchmove",
  event => {

    if (
      !modalContent.classList.contains(
        "pdf-mode"
      ) ||
      !pdfZoomLayer
    ) {

      return;
    }

    if (
      event.touches.length === 2
    ) {

      event.preventDefault();

      const currentDistance =
        getDistance(
          event.touches[0],
          event.touches[1]
        );

      if (
        pdfInitialDistance === 0
      ) {

        return;
      }

      let newScale =
        pdfInitialScale *
        (
          currentDistance /
          pdfInitialDistance
        );

      newScale =
        Math.max(
          1,
          Math.min(
            newScale,
            15
          )
        );

      const midpoint =
        getMidpoint(
          event.touches[0],
          event.touches[1]
        );

      const rect =
        modalContent.getBoundingClientRect();

      const localX =
        midpoint.x -
        rect.left;

      const localY =
        midpoint.y -
        rect.top;

      if (
        newScale > 1
      ) {

        modalContent.style.overflow =
          "hidden";

        modalContent.scrollTop =
          0;

        pdfScale =
          newScale;

        pdfTranslateX =
          localX -
          pdfInitialContentX *
          newScale;

        pdfTranslateY =
          localY -
          pdfInitialContentY *
          newScale;

        updatePdfTransform();

      } else {

        pdfScale =
          1;

        const restoredScroll =
          Math.max(
            0,
            pdfInitialContentY
          );

        pdfTranslateX =
          0;

        pdfTranslateY =
          0;

        updatePdfTransform();

        modalContent.scrollTop =
          Math.min(
            restoredScroll,
            Math.max(
              0,
              pdfZoomLayer.offsetHeight -
              modalContent.clientHeight
            )
          );
      }

      return;
    }

    if (
      event.touches.length === 1 &&
      pdfIsDragging &&
      pdfScale > 1
    ) {

      event.preventDefault();

      pdfTranslateX =
        event.touches[0].clientX -
        pdfStartX;

      pdfTranslateY =
        event.touches[0].clientY -
        pdfStartY;

      pdfZoomLayer.style.transition =
        "none";

      updatePdfTransform();
    }

  },
  {
    passive: false
  }
);


/* =========================
   TOUCH END - PDF
   ========================= */

modalContent.addEventListener(
  "touchend",
  event => {

    if (
      !modalContent.classList.contains(
        "pdf-mode"
      )
    ) {

      return;
    }

    if (
      event.touches.length < 2
    ) {

      pdfInitialDistance =
        0;
    }

    if (
      event.touches.length === 0
    ) {

      pdfIsDragging =
        false;

      if (pdfZoomLayer) {

        pdfZoomLayer.style.transition =
          "none";

        updatePdfTransform();
      }
    }

  }
);


/* =========================
   DOBLE TOQUE - PDF
   ========================= */

modalContent.addEventListener(
  "touchend",
  event => {

    if (
      !modalContent.classList.contains(
        "pdf-mode"
      ) ||
      !pdfZoomLayer
    ) {

      return;
    }

    if (
      event.touches.length !== 0
    ) {

      return;
    }

    const now =
      Date.now();

    if (
      now - pdfLastTap < 300
    ) {

      if (pdfAnimationTimeout) {

        clearTimeout(
          pdfAnimationTimeout
        );

        pdfAnimationTimeout =
          null;
      }

      const touch =
        event.changedTouches[0];

      if (!touch) {

        pdfLastTap =
          now;

        return;
      }

      if (
        pdfScale === 1
      ) {

        pdfZoomLayer.style.transition =
          "transform 0.25s ease";

        void pdfZoomLayer.offsetWidth;

        zoomPdfAtPoint(
          2.5,
          touch.clientX,
          touch.clientY
        );

      } else {

        const rect =
          modalContent.getBoundingClientRect();

        const localY =
          touch.clientY -
          rect.top;

        const contentY =
          (
            localY -
            pdfTranslateY
          ) /
          pdfScale;

        pdfZoomLayer.style.transition =
          "transform 0.25s ease";

        void pdfZoomLayer.offsetWidth;

        pdfScale =
          1;

        pdfTranslateX =
          0;

        pdfTranslateY =
          0;

        modalContent.style.overflowY =
          "auto";

        modalContent.style.overflowX =
          "hidden";

        modalContent.style.touchAction =
          "pan-y";

        pdfZoomLayer.style.touchAction =
          "pan-y";

        pdfZoomLayer.style.transform =
          "translate(0px, 0px) scale(1)";

        modalContent.scrollTop =
          Math.min(
            Math.max(
              0,
              contentY
            ),
            Math.max(
              0,
              pdfZoomLayer.offsetHeight -
              modalContent.clientHeight
            )
          );
      }

      pdfAnimationTimeout =
        setTimeout(
          () => {

            if (pdfZoomLayer) {

              pdfZoomLayer.style.transition =
                "none";

              updatePdfTransform();
            }

            pdfAnimationTimeout =
              null;

          },
          250
        );
    }

    pdfLastTap =
      now;

  }
);


/* =========================
   CAMBIO DE TAMAÑO
   ========================= */

window.addEventListener(
  "resize",
  () => {

    modalImage.style.transition =
      "none";

    updateImageTransform();

  }
);


/* =========================
   BUSCADOR
   ========================= */

search.addEventListener(
  "input",
  renderLists
);


/* =========================
   CARGAR LISTAS DESDE SUPABASE
   ========================= */

async function loadLists(
  forceRender = false
) {

  const {
    data,
    error
  } =
    await supabaseClient
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

    return;
  }

  const newSignature =
    getListsSignature(
      data
    );

  const oldSignature =
    getListsSignature(
      lists.map(list => ({

        id:
          list.id,

        nombre:
          list.name,

        archivo:
          list.file,

        tipo:
          list.type

      }))
    );

  if (
    !forceRender &&
    newSignature === oldSignature
  ) {

    return;
  }

  lists =
    data.map(list => ({

      id:
        list.id,

      name:
        list.nombre,

      file:
        list.archivo,

      type:
        list.tipo

    }));

  const currentFiles =
    new Set(
      lists.map(
        list => list.file
      )
    );

  for (
    const cachedFile
    of previewCache.keys()
  ) {

    if (
      !currentFiles.has(
        cachedFile
      )
    ) {

      previewCache.delete(
        cachedFile
      );
    }
  }

  await renderLists();
}


/* =========================
   ACTUALIZACIÓN AUTOMÁTICA
   ========================= */

let refreshTimer =
  null;


function startAutoRefresh() {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    );
  }

  refreshTimer =
    setInterval(
      () => {

        loadLists();

      },
      5000
    );
}


/* =========================
   PAUSAR ACTUALIZACIÓN
   CUANDO LA PÁGINA NO ESTÁ VISIBLE
   ========================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      loadLists(
        true
      );

      startAutoRefresh();

    } else {

      if (refreshTimer) {

        clearInterval(
          refreshTimer
        );

        refreshTimer =
          null;
      }
    }

  }
);


/* =========================
   INICIO
   ========================= */

loadLists(
  true
);

startAutoRefresh();


/* ========================================
   NAVEGACIÓN ENTRE ANUNCIOS Y LISTAS
======================================== */

const navOptions = document.querySelectorAll(".nav-option");
const contentSections = document.querySelectorAll(".content-section");

navOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const selectedSection = option.dataset.section;

    // Actualizar la opción seleccionada
    navOptions.forEach((item) => {
      const isActive = item === option;

      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    // Mostrar únicamente la sección seleccionada
    contentSections.forEach((section) => {
      const isSelected = section.id === selectedSection;

      section.hidden = !isSelected;
      section.classList.toggle("active", isSelected);
    });

    // Actualizar el subtítulo del encabezado
    const headerSubtitle = document.querySelector(".header-title p");

    if (headerSubtitle) {
      headerSubtitle.textContent =
        selectedSection === "anuncios" ? "Anuncios" : "Listas";
    }
  });
});
