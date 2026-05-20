let cart = [];
let total = 0;

function addToCart(name, price) {
  cart.push({ name, price });
  total += price;
  render();
}

function render() {
  const cartDiv = document.getElementById("cart");
  cartDiv.innerHTML = "";

  cart.forEach((item, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
      ${item.name} - ${item.price}€
      <button onclick="removeItem(${index})">X</button>
    `;
    cartDiv.appendChild(div);
  });

  document.getElementById("total").innerText = total;
}

function removeItem(index) {
  total -= cart[index].price;
  cart.splice(index, 1);
  render();
}
