const stories = [
  "ahmet",
  "zeynep",
  "mert",
  "elif",
  "can",
  "esra",
  "berk",
  "ece"
];

const storiesContainer = document.getElementById("stories");

stories.forEach((username) => {
  const item = document.createElement("article");
  item.className = "story";
  item.innerHTML = `<div class="story-ring"></div><span>${username}</span>`;
  storiesContainer.appendChild(item);
});
