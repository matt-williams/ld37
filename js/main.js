var scene, camera, renderer;
var geometry, material, mesh;
var tiles = {};
var player;
var mixer;

var TILE_KEY = {
  'b': 'banister',
  'O': 'column',
  'L': 'concave-corner',
  '¬': 'convex-corner',
  'D': 'doorway',
  'd': 'door',
  '#': 'stone-floor',
  'T': 'hairpin',
  'X': 'occluder',
  '|': 'wall',
  'S': 'wall-support',
  'W': 'wood-floor',
  'w': 'wood-floor-edge'
};
var ROTATION_KEY = {
  ' ': 0,
  '>': 0,
  '^': Math.PI / 2,
  '<': Math.PI,
  'v': 3 * Math.PI / 2
};

var map = [
  [
    "# # # # #             ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "# # # # # # # # # # # ",
    "            # # # # # ",
  ],
  [
    "Lv|v|v|vL<            ",
    "|>      |<  Lv|v|v|vL<",
    "|>      ¬<|v¬v      |<",
    "|>                  |<",
    "D>                  D<",
    "|>                  |<",
    "|>      ¬^|^¬>      |<",
    "L>|^|^|^L^  |>      |<",
    "            L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  # # # # # ",
    "|>      |<  Lv+# |v+# |v+# |v+# L<+# ",
    "|>      ¬<|v¬vw^w^w^|<",
    "|>                  |<",
    "|>                  |<",
    "|>                  |<",
    "|>wvwvwv¬^|^¬>      |<",
    "L>+# |^+# |^+# |^+# L^+#   |>      |<",
    "# # # # #   L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  Lv|v|v|vL<",
    "S>+# W>W>W>S<+#   D>      D<",
    "|>w^w^w^¬<Sv+# ¬vb^b^b^|<",
    "|>      w>Wvw<      |<",
    "|>      w>Wvw<      |<",
    "|>      w>Wvw<      |<",
    "|>bvbvbv¬^S^+# ¬>wvwvwv|<",
    "D>      D<  S>+# W<W<W<S<+# ",
    "L>|^|^|^L^  L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  Lv|v|v|vL<",
    "D>      D<  |>      |<",
    "|>b^b^b^¬<Dv¬v      |<",
    "|>      b>  b<      |<",
    "|>      b>  b<      |<",
    "|>      b>  b<      |<",
    "|>      ¬^D^¬>bvbvbv|<",
    "|>      |<  D>      D<",
    "L>|^|^|^L^  L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  Lv|v|v|vL<",
    "|>      |<  |>      |<",
    "|>      ¬<|v¬v      |<",
    "|>                  |<",
    "|>                  |<",
    "|>                  |<",
    "|>      ¬^|^¬>      |<",
    "|>      |<  |>      |<",
    "L>|^|^|^L^  L>|^|^|^L^",
  ],
  [
    "X X X X X X X X X X X ",
    "X       X X X       X ",
    "X       X X X       X ",
    "X                   X ",
    "X                   X ",
    "X                   X ",
    "X       X X X       X ",
    "X       X X X       X ",
    "X X X X X X X X X X X ",
  ],
];
/*
var map = [
[
"  # # # # # # # ",
"  # # # # # # # ",
"  # # # # # # # ",
"  # # # # # # # ",
],
[
"  Lv|v|vDv+dv|vL<",
"  |>        |<",
"  |>        ¬<+# ",
"  |>          ",
],
[
"  Lv|v|v|v|vL<",
"  |>        ¬<",
"  |>          ",
"  |>          ",
],
[
"  Lv|v|v|v|vL<",
"  |>        ¬<",
"  S>          ",
"  |>          ",
],
[
"  Lv|v|v|v|vL<",
"  |>wvwv    ¬<",
"  |>+#>W W w<    ",
"  |>w^w^      ",
],
[
"  Lv|v|v|v|vL<",
"  |>bvbv    ¬<",
"  D>+ >    b<    ",
"  |>b^b^      ",
],
[
"X X X X X X X ",
"X X         X ",
"X X           ",
"X X           ",
],
];
*/
var mapOrigin = {x: -5, y: 0, z: -4};

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
  camera.rotation.x = -Math.PI / 2;
  camera.position.set(0, 10, 0);

  mixer = new THREE.AnimationMixer(scene);

  var loadingManager = new THREE.LoadingManager(function() {
    for (var y = 0; y < map.length; y++) {
      var floorMap = map[y];
      for (var z = 0; z < floorMap.length; z++) {
        var tileRow = floorMap[z].match(/.{2}(\+.{2})*/g);
        for (var x = 0; x < tileRow.length; x++) {
          var tileComponents = tileRow[x].split('+');
          for (var i = 0; i < tileComponents.length; i++) {
            var tile = tiles[tileComponents[i].charAt(0)];
            if (tile) {
              var mesh = new THREE.Mesh(tile.geometry, tile.material);
              mesh.scale.set(0.5, 0.5, 0.5);
              mesh.position.set(x + mapOrigin.x, y + mapOrigin.y, z + mapOrigin.z);
              mesh.rotation.y = ROTATION_KEY[tileComponents[i].charAt(1)] || 0;
              scene.add(mesh);
            }
          }
        }
      }
    }
  });
  var jsonLoader = new THREE.JSONLoader(loadingManager);
  for (var key in TILE_KEY) {
    var tileName = TILE_KEY[key];
    jsonLoader.load('data/' + tileName + '.json', function(key, tileName) {
      return function(geometry, materials) {
        material = new THREE.MeshFaceMaterial(materials);
        tiles[key] = {tileName: tileName, geometry: geometry, material: material};
      }
    }(key, tileName));
  }
  jsonLoader.load('data/sneak.json', function(geometry, materials) {
    console.log(geometry, materials);
    material = materials[0];
    material.skinning = true;
    player = {geometry: geometry, material: material};
    mixer.clipAction(geometry.animations[0]);
    var mesh = new THREE.SkinnedMesh(player.geometry, player.material);
    mesh.scale.set(0.03, 0.03, 0.03);
    mesh.position.set(0, 4.2, 0);
    scene.add(mesh);
    playerMesh = mesh;
    mixer.clipAction("Walk", mesh).play();
  });

  var directionalLight = new THREE.DirectionalLight(0x7f7f7f, 2);
  directionalLight.position.set(0, 1, 0);
  scene.add(directionalLight);

  var ambientLight = new THREE.AmbientLight(0x808080);
  scene.add(ambientLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.getElementById("container").appendChild(renderer.domElement);
}

var t = 0;
function animate() {
  requestAnimationFrame(animate);

//  t++;
//  camera.position.x = Math.sin(t * 0.025);
//  camera.position.y = 6 + 2.5 * Math.cos(t * 0.036);
//  camera.position.z = 0.75 * Math.sin(t * 0.026);

  mixer.update(0.03);

  renderer.render(scene, camera);
}
