console.log("Mega Financial Web App frontend loaded successfully.");

const header = document.getElementById("site-header");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navLinks = document.getElementById("navLinks");


window.addEventListener("scroll", () => {
  if (!header) return;

  if (window.scrollY > 20) {
    header.classList.add("nav-hidden");
  } else {
    header.classList.remove("nav-hidden");
  }
});


hamburgerBtn.addEventListener("click", () => {
  hamburgerBtn.classList.toggle("active");
  navLinks.classList.toggle("active");
});

navLinks.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    hamburgerBtn.classList.remove("active");
    navLinks.classList.remove("active");
  }
});
