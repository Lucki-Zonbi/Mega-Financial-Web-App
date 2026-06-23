console.log("Mega Financial Web App frontend loaded successfully.");

const header = document.getElementById("site-header");

window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    header.classList.add("scrolling");
  } else {
    header.classList.remove("scrolling");
  }
});
