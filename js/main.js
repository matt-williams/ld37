var scene, camera, renderer;
var geometry, material, mesh;
var tiles = {};
var mixer;
var player;
var floors = [];

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
    "                      ",
    "  # # #               ",
    "  # # #       # # #   ",
    "  # # # # # # # # #   ",
    "# # # # # # # # # # # ",
    "  # # # # # # # # #   ",
    "  # # #       # # #   ",
    "              # # #   ",
    "                      ",
  ],
  [
    "Lv|v|v|vL<            ",
    "|>      |<  Lv|v|v|vL<",
    "|>      ¬<|v¬v      |<",
    "|>                  |<",
    "D>(0,2,3)                  D<+d<",
    "|>                  |<",
    "|>      ¬^|^¬>      |<",
    "L>|^|^|^L^  |>      |<",
    "            L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<            ",
    "|>      |<  Lv+# |v+# |v+# |v+# L<+# ",
    "|>      ¬<|v¬vw^w^w^|<",
    "|>                  |<",
    "|>                  |<",
    "|>                  |<",
    "|>wvwvwv¬^|^¬>      |<",
    "L>+# |^+# |^+# |^+# L^+#   |>      |<",
    "            L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  Lv|v|v|vL<",
    "S>+# W>W>W>S<+#   D>(-2,0,6)      D<(0,1,6)",
    "|>w^w^w^¬<Sv+# ¬vb^b^b^|<",
    "|>      w>Wvw<      |<",
    "|>      w>Wvw<      |<",
    "|>      w>Wvw<      |<",
    "|>bvbvbv¬^S^+# ¬>wvwvwv|<",
    "D>(0,-2,-3)      D<(2,0,-6)  S>+# W<W<W<S<+# ",
    "L>|^|^|^L^  L>|^|^|^L^",
  ],
  [
    "Lv|v|v|vL<  Lv|v|v|vL<",
    "D>+d>      D<(1,0,1)  |>      |<",
    "|>b^b^b^¬<Dv(-1,0,-1)¬v      |<",
    "|>      b>  b<      |<",
    "|>      b>  b<      |<",
    "|>      b>  b<      |<",
    "|>      ¬^D^(1,0,1)¬>bvbvbv|<",
    "|>      |<  D>(-1,0,-1)      D<(0,-1,-6)",
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
var mapOrigin = {x: -5, y: 0, z: -4};

function KeyboardController() {
  this.keys = {left: false, right: false, up: false, down: false};
  var _this = this;
  document.addEventListener('keydown', function(e) {
    switch (e.keyCode) {
      case 65:
        _this.keys.left = true;
        break;
      case 68:
        _this.keys.right = true;
        break;
      case 87:
        _this.keys.up = true;
        break;
      case 83:
        _this.keys.down = true;
        break;
    }
  });
  document.addEventListener('keyup', function(e) {
    switch (e.keyCode) {
      case 65:
        _this.keys.left = false;
        break;
      case 68:
        _this.keys.right = false;
        break;
      case 87:
        _this.keys.up = false;
        break;
      case 83:
        _this.keys.down = false;
        break;
    }
  });
}

function Player(keyboardController, position) {
  this.keyboardController = keyboardController;
  var mesh = new THREE.SkinnedMesh(Player.GEOMETRY, Player.MATERIAL);
  mesh.scale.set(0.04, 0.04, 0.04);
  this.velocity = new THREE.Vector2(0, 0);
  this.position = position || new THREE.Vector3(0, 1, 0);
  this.lastDoorPosition = null;
  mesh.position.set(this.position.x, this.position.y, this.position.z);
  scene.add(mesh);
  this.walkAction = mixer.clipAction("Walk", mesh);
  this.walkAction.play();
  this.mesh = mesh;
}

Player.onload = function(geometry, materials) {
  for (var ii = 0; ii < materials.length; ii++) {
    materials[ii].skinning = true;
  }
  material = new THREE.MeshFaceMaterial(materials);
  mixer.clipAction(geometry.animations[0]);
  Player.GEOMETRY = geometry;
  Player.MATERIAL = material;
}

Player.prototype.getTile = function(delta) {
  delta = delta || new THREE.Vector2();
  var x = Math.floor(this.position.x + delta.x - mapOrigin.x + 0.5);
  var y = Math.floor(this.position.y - mapOrigin.y + 0.5);
  var z = Math.floor(this.position.z + delta.y - mapOrigin.z + 0.5);
  if ((y >= 0) && (y < map.length) &&
      (z >= 0) && (z < map[y].length)) {
    var tileRow = map[y][z].match(/.{2}(\(-?[0-9]+,-?[0-9]+,-?[0-9]+\))?(\+.{2}(\(-?[0-9]+,-?[0-9]+,-?[0-9]+\))?)*/g);
    if ((x >= 0) && (x < tileRow.length)) {
      return tileRow[x];
    }
  }
  return "  ";
}

Player.prototype.update = function(interval) {
  
  var targetVelocity = new THREE.Vector2();
  if (this.keyboardController.keys.left) {
    targetVelocity.x -= 3;
  }
  if (this.keyboardController.keys.right) {
    targetVelocity.x += 3;
  }
  if (this.keyboardController.keys.up) {
    targetVelocity.y -= 3;
  }
  if (this.keyboardController.keys.down) {
    targetVelocity.y += 3;
  }
  this.velocity.x = this.velocity.x * 0.8 + targetVelocity.x * 0.2;
  this.velocity.y = this.velocity.y * 0.8 + targetVelocity.y * 0.2;
  if (this.velocity.length() < 0.1) {
    this.velocity.set(0, 0);
  } else {
    var deltaNextPosition = this.velocity.clone().normalize().multiplyScalar(0.6);
    var currentTile = this.getTile
    var nextTile = this.getTile(deltaNextPosition);
    if ((nextTile.charAt(0) != ' ') && (nextTile.charAt(0) != 'D')) {
      this.velocity.set(0, 0);
    }
  }
  this.position.x += this.velocity.x * interval;
  this.position.z += this.velocity.y * interval;

  var currentTile = this.getTile();
  if (currentTile.charAt(0) == 'D') {
    doorMatch = currentTile.match(/..\((-?[0-9]+),(-?[0-9]+),(-?[0-9]+)\)/);
    if (doorMatch) {
      var doorPosition = new THREE.Vector3(Math.floor(this.position.x + 0.5), Math.floor(this.position.y + 0.5), Math.floor(this.position.z + 0.5));
      if (!this.lastDoorPosition || !doorPosition.equals(this.lastDoorPosition)) {
        this.position.x = doorPosition.x + parseInt(doorMatch[1]);
        this.position.y = doorPosition.y + parseInt(doorMatch[2]);
        this.position.z = doorPosition.z + parseInt(doorMatch[3]);
        this.lastDoorPosition = this.position.clone();
        this.velocity.rotateAround(new THREE.Vector2(), Math.PI + (ROTATION_KEY[this.getTile().charAt(1)] || 0) - (ROTATION_KEY[currentTile.charAt(1)] || 0));
        this.mesh.rotation.y += Math.PI + (ROTATION_KEY[this.getTile().charAt(1)] || 0) - (ROTATION_KEY[currentTile.charAt(1)] || 0);
      }
    }
  }
  if (this.lastDoorPosition && ((Math.floor(this.position.x + 0.5) != this.lastDoorPosition.x) || (Math.floor(this.position.y + 0.5) != this.lastDoorPosition.y) || (Math.floor(this.position.z + 0.5) != this.lastDoorPosition.z))) {
    this.lastDoorPosition = null;
  }

  this.mesh.position.set(this.position.x, this.position.y + 0.1, this.position.z);
  if ((this.velocity.x != 0) || (this.velocity.y != 0)) {
    var targetRotation = Math.atan2(this.velocity.x, this.velocity.y) + Math.PI;
    var rotationDelta = ((this.mesh.rotation.y - targetRotation + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    if (Math.abs(rotationDelta) < 0.1) {
      this.mesh.rotation.y = targetRotation;
    } else if (rotationDelta < 0) {
      this.mesh.rotation.y = (this.mesh.rotation.y + 0.1 + 2 * Math.PI) % (2 * Math.PI);
    } else {
      this.mesh.rotation.y = (this.mesh.rotation.y - 0.1 + 2 * Math.PI) % (2 * Math.PI);
    }
    this.walkAction.paused = false;
  } else {
    this.walkAction.paused = true;
  }
}

function Floor(tiles, y, floorMap) {
  this.y = y;
  this.tileMaterials = {};
  this.node = new THREE.Object3D();
  for (var z = 0; z < floorMap.length; z++) {
    var tileRow = floorMap[z].match(/.{2}(\(-?[0-9]+,-?[0-9]+,-?[0-9]+\))?(\+.{2}(\(-?[0-9]+,-?[0-9]+,-?[0-9]+\))?)*/g);
    for (var x = 0; x < tileRow.length; x++) {
      var tileComponents = tileRow[x].split('+');
      for (var i = 0; i < tileComponents.length; i++) {
        var tileKey = tileComponents[i].charAt(0);
        var tile = tiles[tileKey];
        if (tile) {
          if (!this.tileMaterials[tileKey]) {
            var materials = tiles[tileKey].material.materials;
            var floorMaterials = [];
            for (var ii = 0; ii < materials.length; ii++) {
              floorMaterials[ii] = materials[ii].clone();
            }
            this.tileMaterials[tileKey] = new THREE.MeshFaceMaterial(floorMaterials);
          }
          var mesh = new THREE.Mesh(tile.geometry, this.tileMaterials[tileKey]);
          mesh.scale.set(0.5, 0.5, 0.5);
          mesh.position.set(x, 0, z);
          mesh.rotation.y = ROTATION_KEY[tileComponents[i].charAt(1)] || 0;
          this.node.add(mesh);
        }
      }
    }
  }
  scene.add(this.node);
  this.node.position.set(mapOrigin.x, y + mapOrigin.y, mapOrigin.z);
}

Floor.prototype.update = function(playerY) {
  if (playerY >= this.y) {
    this.node.visible = true;
    for (var key in this.tileMaterials) {
      var materials = this.tileMaterials[key].materials;
      for (var ii = 0; ii < materials.length; ii++) {
        var material = materials[ii];
        material.transparent = false;
        material.opacity = 1;
      }
    }
  } else if (playerY >= this.y - 1) {
    this.node.visible = true;
    for (var key in this.tileMaterials) {
      var materials = this.tileMaterials[key].materials;
      for (var ii = 0; ii < materials.length; ii++) {
        var material = materials[ii];
        material.transparent = true;
        material.opacity = playerY - (this.y - 1);
      }
    }
  } else {
    this.node.visible = false;
  }
}

init();
animate();

function init() {
  keyboardController = new KeyboardController();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
  //camera.position.set(0, 2, 0);
  camera.rotation.x = -Math.PI / 2;
  camera.position.set(0, 6, 0);

  mixer = new THREE.AnimationMixer(scene);

  var loadingManager = new THREE.LoadingManager(function() {
    for (var y = 0; y < map.length; y++) {
      floors[y] = new Floor(tiles, y, map[y]);
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
    Player.onload(geometry, materials);
    player = new Player(keyboardController);
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

  if (player) {
    player.update(0.03);
    camera.position.x = player.position.x;
    var yDifference = player.position.y + 5 - camera.position.y;
    if (Math.abs(yDifference) < 0.05) {
      camera.position.y += yDifference;
    } else {
      camera.position.y += Math.sign(yDifference) * 0.05;
    } 
    camera.position.z = player.position.z;
    for (var ii = 0; ii < floors.length; ii++) {
      floors[ii].update(camera.position.y - 5);
    }
  }
  mixer.update(0.03);

  renderer.render(scene, camera);
}
