Pizza Rush - Red and White Tablecloth Edition

Open index.html in your browser. The outer brown background has been replaced
with a red-and-white checkered tablecloth pattern matching your reference.
The pizza stays on the wooden prep table within the pizzeria scene.

Files: index.html, style.css, script.js, pizzeria-background.png,
wood-prep-table.png.


EXIT — BACK TO SHOP
The red Exit — Back to Shop button appears at the top of the game.
Inside an iframe, it posts {type: 'closePizzaGame'} to the parent page.
The 3D shop must listen for this message and hide its pizza iframe/modal.

Example in your 3D shop JavaScript:
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'closePizzaGame') {
    document.getElementById('pizzaGameOverlay')?.classList.add('hidden');
  }
});

For standalone mode, the button goes to ../shop/index.html by default.
If your shop page is somewhere else, open the pizza maker with
?shop=../your-shop/index.html to set the return location.

MANUAL TOPPINGS: In step 4, select a topping button, then click/tap individual positions on the pizza. Each tap adds exactly one piece. Use Undo last piece or Clear toppings. The completed result also includes toppingPieces with name and x/y positions.

Exit button is larger throughout and becomes a large fixed green Back to Shop button when the pizza order is completed.

NEW: Sauce and cheese each have five selectable varieties. Choose one and drag over the pizza to paint by hand. Undo/Clear available. Phone orders may specify sauce and cheese fields.

ADDED: Bacon, Anchovies, and Artichoke as individually placeable toppings. Pizza now visibly darkens/burns during overbaking and becomes charred if left too long.

NEW: Crust seasoning station after toppings. Choose Garlic Butter, Italian Herbs, Parmesan Garlic, Everything Seasoning, or Plain Crust. Drag or tap the crust rim to season it manually; Undo and Clear included. Baking and boxing now follow seasoning.

NEW: Every new standalone order is randomly generated: size, 0-3 unique toppings, sauce, cheese, crust seasoning, and delivery address. Restart produces another order. External shop-provided orders still take priority.

NEW: Click Box Pizza to see a closed illustrated cardboard pizza delivery box physically cover the pizza. Finishing the order displays a clear 'Exit back to the shop and get ready for delivery' instruction and the large Back to Shop button.
