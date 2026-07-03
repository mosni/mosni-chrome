const eyeLeftOffsetX = 78;
const eyeLeftOffsetY = 129;

const eyeRightOffsetX = 194;
const eyeRightOffsetY = 129;

const eyeSize = 58;

const catImg = document.querySelector<HTMLImageElement>("img#cat-image")!;

const catEyeLeft = document.createElement("canvas");
const catEyeRight = document.createElement("canvas");

catEyeLeft.classList.add("eye");
catEyeRight.classList.add("eye");

document.body.appendChild(catEyeLeft);
document.body.appendChild(catEyeRight);

const intializeCat = function (updateSize = true): void {
  const catRect = catImg.getBoundingClientRect();

  catImg.style.opacity = "1";

  catEyeLeft.style.left = catRect.left + eyeLeftOffsetX + "px";
  catEyeLeft.style.top = catRect.top + eyeLeftOffsetY + "px";
  catEyeLeft.style.opacity = "1";

  catEyeRight.style.left = catRect.left + eyeRightOffsetX + "px";
  catEyeRight.style.top = catRect.top + eyeRightOffsetY + "px";
  catEyeRight.style.opacity = "1";

  if (updateSize) {
    catEyeLeft.style.width = eyeSize + "px";
    catEyeLeft.style.height = eyeSize + "px";
    catEyeLeft.width = eyeSize;
    catEyeLeft.height = eyeSize;
    catEyeRight.style.width = eyeSize + "px";
    catEyeRight.style.height = eyeSize + "px";
    catEyeRight.width = eyeSize;
    catEyeRight.height = eyeSize;
  }
};

const drawEyes = function (x: number, y: number): void {
  const rectl = catEyeLeft.getBoundingClientRect();
  const rectr = catEyeRight.getBoundingClientRect();

  const ctxl = catEyeLeft.getContext("2d")!;
  const ctxr = catEyeRight.getContext("2d")!;

  ctxl.fillStyle = "black";
  ctxr.fillStyle = "black";

  const drawEye = function (
    rect: DOMRect,
    ctx: CanvasRenderingContext2D,
  ): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    let tx = x - rect.left;
    let ty = y - rect.top;
    const center = getCenter(rect);
    const distance = getDistance(x, y, center[0], center[1]);
    if (distance > 20) {
      const angle = Math.atan2(y - center[1], x - center[0]);
      tx = ctx.canvas.width / 2 + 20 * Math.cos(angle);
      ty = ctx.canvas.height / 2 + 20 * Math.sin(angle);
    }

    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
    ctx.fill();
  };
  drawEye(rectr, ctxr);
  drawEye(rectl, ctxl);
};
const getDistance = function (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};
const getCenter = function (rect: DOMRect): [number, number] {
  const x = rect.left + (rect.right - rect.left) / 2;
  const y = rect.top + (rect.bottom - rect.top) / 2;
  return [x, y];
};

if (!catImg.complete) {
  catImg.addEventListener("load", () => {
    intializeCat();
    drawEyes(window.innerWidth / 2, window.innerHeight / 2);
  });
} else {
  intializeCat();
  drawEyes(window.innerWidth / 2, window.innerHeight / 2);
}

function init(): void {
  window.addEventListener("resize", () => {
    intializeCat(false);
  });

  document.addEventListener("mousemove", (e) => {
    drawEyes(e.clientX, e.clientY);
  });
  document.addEventListener("dragover", (e) => {
    drawEyes(e.clientX, e.clientY);
  });
  document.addEventListener("touchstart", (e) => {
    drawEyes(e.touches[0].clientX, e.touches[0].clientY);
  });
  document.addEventListener("touchmove", (e) => {
    drawEyes(e.touches[0].clientX, e.touches[0].clientY);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => init());
} else {
  init();
}
