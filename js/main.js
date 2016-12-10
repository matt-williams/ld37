var scene, camera, renderer;
var geometry, material, mesh;
var tiles = {};

var TILE_KEY = {
  'O': 'column',
  'L': 'concave-corner',
  '¬': 'convex-corner',
  '#': 'stone-floor',
  'T': 'hairpin',
  'X': 'occluder',
  '|': 'wall'
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
"  # # # # # # # ",
"  # # # # # # # ",
"  # # # # # # # ",
"  # # # # # # # ",
],
[
"  Lv|v|v|v|vL<",
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
"X X X X X X X ",
"X X         X ",
"X X           ",
"X X           ",
],
];
var mapOrigin = {x: -3, y: 0, z: -3};

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
  camera.rotation.x = -Math.PI / 2;
  camera.position.set(0, 10, 0);

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
              mesh = new THREE.Mesh(tile.geometry, tile.material);
              mesh.scale.set(0.5, 0.5, 0.5);
              mesh.position.set(x + mapOrigin.x, y + mapOrigin.y, z + mapOrigin.z);
              mesh.rotation.y = ROTATION_KEY[tileRow[x].charAt(1)] || 0;
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

  if (mesh) {
    camera.position.x = Math.sin(t * 0.025);
    camera.position.z = Math.cos(t * 0.026);
    t++;
  }

  renderer.render(scene, camera);
}
