/**
 *
 * WebGL With Three.js - Lesson 10 - Drag and Drop Objects
 * http://www.script-tutorials.com/webgl-with-three-js-lesson-10/
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2015, Script Tutorials
 * http://www.script-tutorials.com/
 */

sbVertexShader = [
"varying vec3 vWorldPosition;",
"void main() {",
"  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
"  vWorldPosition = worldPosition.xyz;",
"  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
"}",
].join("\n");

sbFragmentShader = [
"uniform vec3 topColor;",
"uniform vec3 bottomColor;",
"uniform float offset;",
"uniform float exponent;",
"varying vec3 vWorldPosition;",
"void main() {",
"  float h = normalize( vWorldPosition + offset ).y;",
"  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( h, exponent ), 0.0 ) ), 1.0 );",
"}",
].join("\n");


class ArrowsGroup {
  constructor() {
    this.controlsArrow = null;
    this.mechanismsArrow = null;
    this.inputsArrow = null;
    this.outputsArrow = null;
    this.fromParentArrow = null;
    this.toChildArrow = null;
  }
}

class IDEFFunction {
  constructor(box) {
    this.box = box;
    this.onHoverArrows = new ArrowsGroup();
    this.onSelectArrows = new ArrowsGroup();
    this.fixedArrows = new ArrowsGroup();
  }

  onHover() {

  }

  onSelect() {

  }

  onRemove() {

  }

  updatePosition(point) {

  }
}

var IDEF = {
  scene: null, camera: null, renderer: null,
  container: null, controls: null,
  clock: null, stats: null,
  planeMesh: null, selection: null, offset: new THREE.Vector3(), objects: [],
  planeNormal: null,
  plane: null,
  raycaster: new THREE.Raycaster(),
  selectedForAdding: false,

  dirOx: new THREE.Vector3( 1, 0, 0 ),  invDirOx: new THREE.Vector3( -1, 0, 0 ),
  dirOy: new THREE.Vector3( 0, 1, 0 ),  invDirOy: new THREE.Vector3( 0, -1, 0 ),
  dirOz: new THREE.Vector3( 0, 0, 1 ),  invDirOz: new THREE.Vector3( 0, 0, -1 ),

  cubeSize: 5,
  arrowSize: 6,

  linkObjectA: null,
  linkObjectB: null,

  CONTROL: "controlsArrow", 
  MECHANISM: "mechanismsArrow", 
  INPUT: "inputsArrow", 
  OUTPUT: "outputsArrow", 
  FROM_PARENT: "fromParentArrow", 
  TO_CHILD: "toChildArrow",

  arrowTypes: null,

  hoverHighlightedObject: null,
  hoverHighlightedEdges: null,
  hoverHighlightedArrows: {
    controlsArrow: null,
    mechanismsArrow: null,
    inputsArrow: null,
    outputsArrow: null,
    fromParentArrow: null,
    toChildArrow: null
  },
  hoveredConnectionPoints: [],
  currentHoveredConnectionPoint: null,

  selectHightlightedObject: null,
  selectHightlightedEdges: null,
  selectHighlightedArrows: {
    controlsArrow: null,
    mechanismsArrow: null,
    inputsArrow: null,
    outputsArrow: null,
    fromParentArrow: null,
    toChildArrow: null
  },
  selectedConnectionPoints: [],
  currentSelectedConnectionPointA: null,
  currentSelectedConnectionPointB: null,

  connectionPointRadius: 1,
  normalConnectionPointColor: 0xB4045F,
  hoveredConnectionPointColor: 0xFE2E64,

  connectionPoint: new THREE.SphereGeometry(1, 24, 24),
  connectionEditingMode: false,

  tooltip: null,
  lineMaterial: null,

  objectsColor: 0xDBA901,
  hoverHighlightColor: 0x610B21,
  selectHighlightColor: 0x013ADF,

  linkColor: 0x0B615E,

  currentEditModeLine: null,
  positions: null,

  arrowTypeA: null,
  arrowTypeB: null,

  startArrowObject: null,

  transparentCube: null,
  transparentCubeGeometry: null,
  transparentCubeEdges: null,

  links: [],
  linkLines: [],

  commonIDEFFuncId: 0,
  commonLinkId: 0,

  currentHighlightedLink: null,
  currentSelectedLink: null,

  selectedLineMaterial: null,
  hoveredLineMaterial: null,

  init: function() {

    // Create main scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xcce0ff, 0.0003);

    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;

    // Prepare perspective camera
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 1, FAR = 1000;
    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.scene.add(this.camera);
    this.camera.position.set(100, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    // Prepare webgl renderer
    //this.renderer = new THREE.WebGLRenderer({ antialias:true });
    
    if ( Detector.webgl )
      this.renderer = new THREE.WebGLRenderer( {antialias:true} );
    else
      this.renderer = new THREE.CanvasRenderer();

    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.renderer.setClearColor(this.scene.fog.color);

    // Prepare container
    this.container = document.getElementById('#idef-area');
    this.container.appendChild(this.renderer.domElement);

    // Events
    THREEx.WindowResize(this.renderer, this.camera);
    document.addEventListener('mousedown', this.onDocumentMouseDown, false);
    document.addEventListener('mousemove', this.onDocumentMouseMove, false);
    document.addEventListener('mouseup', this.onDocumentMouseUp, false);

    // on mouse right click - reset edit mode line
    $(document).mousedown(function(ev){
      if (ev.which == 3)
      {
        if (IDEF.startArrowObject) {
          IDEF.arrowTypes.forEach(function(item, i, arr) {
            if (IDEF.startArrowObject[item] && !IDEF.startArrowObject[item].links) {
              IDEF.scene.remove(IDEF.startArrowObject[item]);
              IDEF.startArrowObject[item] = null;

              var objectPos = IDEF.startArrowObject.position.clone();
              var oldPosX = objectPos.x, oldPosY = objectPos.y, oldPosZ = objectPos.z;

              if (item == IDEF.CONTROL && !IDEF.selectHighlightedArrows[item]) {
                objectPos.z = oldPosZ - (IDEF.cubeSize / 2 + IDEF.arrowSize);
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.dirOz, IDEF.arrowSize, IDEF.selectHighlightColor);
              }

              if (item == IDEF.MECHANISM && !IDEF.selectHighlightedArrows[item]) {
                objectPos.z = oldPosZ + (IDEF.cubeSize / 2 + IDEF.arrowSize);
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.invDirOz, IDEF.arrowSize, IDEF.selectHighlightColor);
              }

              if (item == IDEF.INPUT && !IDEF.selectHighlightedArrows[item]) {
                objectPos.z = oldPosZ;
                objectPos.x = oldPosX - (IDEF.cubeSize / 2 + IDEF.arrowSize);
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.dirOx, IDEF.arrowSize, IDEF.selectHighlightColor);
              }

              if (item == IDEF.OUTPUT && !IDEF.selectHighlightedArrows[item]) {
                objectPos.z = oldPosZ;
                objectPos.x = oldPosX + IDEF.cubeSize / 2;
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.dirOx, IDEF.arrowSize, IDEF.selectHighlightColor);
              }      

              if (item == IDEF.FROM_PARENT && !IDEF.selectHighlightedArrows[item]) {
                objectPos.x = oldPosX;
                objectPos.y = oldPosY + (IDEF.cubeSize / 2 + IDEF.arrowSize);
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.invDirOy, IDEF.arrowSize, IDEF.selectHighlightColor);
              }

              if (item == IDEF.TO_CHILD && !IDEF.selectHighlightedArrows[item]) {
                objectPos.x = oldPosX;
                objectPos.y = oldPosY - IDEF.cubeSize / 2;
                IDEF.selectHighlightedArrows[item] = IDEF.drawArrow(objectPos, IDEF.invDirOy, IDEF.arrowSize, IDEF.selectHighlightColor);
              }

            }
          });
        }

        IDEF.resetLinkConnectionPoints();
        IDEF.resetEditModeLine();
      }
    });

    // click on ADD IDEF FUNCTION button
    $('#add-item').click(function(event) {
      event.preventDefault();
      IDEF.resetLinkConnectionPoints();
      IDEF.resetEditModeLine();
      IDEF.selectIDEFFunctionItemForAdding(event);
    });

    // on DELETE key press
    $(document).keyup(function(e) {
      if (e.keyCode == 46) {
        if (IDEF.currentSelectedLink) {
          IDEF.removeLink(IDEF.currentSelectedLink);
        }

        if (IDEF.selectHighlightedObject) {
          IDEF.removeIDEFFunction(IDEF.selectHighlightedObject);
        }
      }
    });

    // clear the scene
    $('#clear-all').click(function(event) {
      event.preventDefault();

      IDEF.resetHighlighting(true);
      IDEF.resetHighlighting();
      IDEF.resetLinkHighlighting(true);
      IDEF.resetLinkHighlighting();

      IDEF.objects.forEach(function(item, i, arr) {
        IDEF.scene.remove(item);
      });
      IDEF.objects.length = 0;


      IDEF.links.forEach(function(item, i, arr) {
        IDEF.scene.remove(item);
      });
      IDEF.links.length = 0;

      IDEF.linkLines.forEach(function(item, i, arr) {
        IDEF.scene.remove(item);
      });
      IDEF.linkLines.length = 0;

    });

    
    // Prepare Orbit controls
    this.controls = new THREE.OrbitControls(this.camera);
    this.controls.target = new THREE.Vector3(0, 0, 0);
    this.controls.maxDistance = 150;

    // Prepare clock
    this.clock = new THREE.Clock();

    // Prepare stats
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.left = '50px';
    this.stats.domElement.style.bottom = '50px';
    this.stats.domElement.style.zIndex = 1;
    this.container.appendChild( this.stats.domElement );

    // Add lights
    this.scene.add( new THREE.AmbientLight(0x444444));

    var dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(200, 200, 1000).normalize();
    this.camera.add(dirLight);
    this.camera.add(dirLight.target);

    // Display skybox
    this.addSkybox();

    // Plane, that helps to determinate an intersection position
    this.planeMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
    this.planeMesh.visible = false;
    this.scene.add(this.planeMesh);

    this.plane = new THREE.Plane();
    this.planeNormal = new THREE.Vector3();

    this.arrowTypes = [ this.CONTROL, this.MECHANISM, this.INPUT, this.OUTPUT, this.FROM_PARENT, this.TO_CHILD ]

    this.lineMaterial = new THREE.LineBasicMaterial( { color: this.linkColor, linewidth: 3 } );
    this.selectedLineMaterial = new THREE.LineBasicMaterial({color: 0xFA5858, linewidth: 5});
    this.hoveredLineMaterial = new THREE.LineBasicMaterial({color: this.linkColor, linewidth: 5});

    // edit mode line
    this.positions = new Float32Array(3);

    var geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0,0,0));
    geometry.vertices.push(new THREE.Vector3(0,0,0));
    geometry.dynamic = true;

    var material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 4
    });
    
    this.currentEditModeLine = new THREE.Line(geometry, material);

    this.scene.add(this.currentEditModeLine);
    
    this.tooltip = document.getElementById('coupontooltip');

    var transparentCubeMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    
    this.transparentCubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    this.transparentCube = new THREE.Mesh(this.transparentCubeGeometry.clone(), transparentCubeMaterial);
    this.transparentCube.scale.x = this.transparentCube.scale.y = this.transparentCube.scale.z = this.cubeSize;
  },

  drawLine: function(pointA, pointB) {
    var lineGeometry = new THREE.Geometry();
    lineGeometry.vertices.push( pointA );
    lineGeometry.vertices.push( pointB );
    lineGeometry.dynamic = true;

    var line = new THREE.Line( lineGeometry, this.lineMaterial );
    this.scene.add( line );

    return line;
  },

  drawArrow: function(startPoint, direction, length, color) {
    var arrowHelper = new THREE.ArrowHelper( direction, startPoint, length, color, length * 0.5 );
    this.scene.add( arrowHelper );

    return arrowHelper;
  },

  drawConnectionPoint: function(center, color) {
    var object, material;
    
    material = new THREE.MeshPhongMaterial({color: color});
    material.transparent = true;
    object = new THREE.Mesh(this.connectionPoint.clone(), material);
    object.scale.x = this.connectionPointRadius;
    object.scale.y = this.connectionPointRadius;
    object.scale.z = this.connectionPointRadius;
    object.position.x = center.x;
    object.position.y = center.y;
    object.position.z = center.z;

    this.scene.add(object);

    return object;
  },

  getMouse3DPoint: function(event) {
    // Get mouse position
    var mousePos = new THREE.Vector2();
    mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

    IDEF.planeNormal.copy(IDEF.camera.position).normalize();
    IDEF.plane.setFromNormalAndCoplanarPoint(IDEF.planeNormal, IDEF.scene.position);
    
    var clicked3DPoint = new THREE.Vector3();
    IDEF.raycaster.setFromCamera(mousePos, IDEF.camera);
    IDEF.raycaster.ray.intersectPlane(IDEF.plane, clicked3DPoint);

    return clicked3DPoint;
  },

  selectConnectionPointToLink: function(point) {
    if (this.currentSelectedConnectionPointA == null) {
      this.currentSelectedConnectionPointA = point;
      this.linkObjectA = point.parentCube;
      this.arrowTypeA = point.parentArrow.arrowType; 

      if (this.linkObjectA[this.arrowTypeA] == null) {
        var arrow = point.parentArrow.clone();
        arrow.arrowType = point.parentArrow.arrowType;
        arrow.arrowTip = point.parentArrow.arrowTip;

        this.linkObjectA[this.arrowTypeA] = arrow;
      }

      this.currentEditModeLine.geometry.vertices[0].x = point.position.x;
      this.currentEditModeLine.geometry.vertices[0].y = point.position.y; 
      this.currentEditModeLine.geometry.vertices[0].z = point.position.z; 

      console.log("point A is selected for linking");
    }
    else if (this.currentSelectedConnectionPointB == null) {
      if (point != this.currentSelectedConnectionPointA) {
        this.currentSelectedConnectionPointB = point;
        this.linkObjectB = point.parentCube;
        this.arrowTypeB = point.parentArrow.arrowType;

        if (this.linkObjectB[this.arrowTypeB] == null) {
          var arrow = point.parentArrow.clone();
          arrow.arrowType = point.parentArrow.arrowType;
          arrow.arrowTip = point.parentArrow.arrowTip;

          this.linkObjectB[this.arrowTypeB] = arrow; 
        }

        if (!this.linkObjectA[this.arrowTypeA].links) {
          this.linkObjectA[this.arrowTypeA].links = [];
        }

        if (!this.linkObjectB[this.arrowTypeB].links) {
          this.linkObjectB[this.arrowTypeB].links = [];
        }

        console.log("point B is selected for linking");

        this.linkConnectionPoints();
      }
      else {
        console.log("point A = point B, no linking");
      }
      
      this.resetLinkConnectionPoints();
      this.resetEditModeLine();
    }
  },

  linkConnectionPoints: function() {
    console.log("linking selected connection points");
    
    this.scene.add(this.linkObjectA[this.arrowTypeA]);
    this.scene.add(this.linkObjectB[this.arrowTypeB]);
    
    var link = this.drawProjectionLinesBetweenPoints(this.linkObjectA[this.arrowTypeA].arrowTip, this.linkObjectB[this.arrowTypeB].arrowTip);
    this.addLinkToObjects(link);
  },

  drawProjectionLinesBetweenPoints: function(pointA, pointB) {
    var link = [];

    var point2 = pointA.clone();
    point2.x = pointB.x;
    
    var line = this.drawLine(pointA, point2);
    link.push(line);   // Ox
    line.parentLink = link;
    this.linkLines.push(line);

    var point3 = point2.clone();
    point3.z = pointB.z;
    
    line = this.drawLine(point2, point3);
    link.push(line);   // Oz
    line.parentLink = link;
    this.linkLines.push(line);    

    line = this.drawLine(point3, pointB);
    link.push(line);   // Oy
    line.parentLink = link;
    this.linkLines.push(line);

    link.idefId = this.commonLinkId;
    this.commonLinkId++;

    link.name = "From: [" + this.linkObjectA.name + "].{" + this.arrowTypeA + "}<br/>To: [" + this.linkObjectB.name + "].{" + this.arrowTypeB + "}";

    return link;
  },

  highlightLink: function(link) {
    this.currentHighlightedLink = link;

    if (this.currentHighlightedLink !== this.currentSelectedLink) {
      
      link.forEach(function(item, i, arr) {
        item.material = IDEF.hoveredLineMaterial;
      });
    }
  },

  selectLink: function(link) {
    if (this.currentSelectedLink) {
      this.resetLinkHighlighting(true);
    }

    if (this.selectHighlightedObject) {
      this.resetHighlighting(true);
    }

    this.currentSelectedLink = link;

    link.forEach(function(item, i, arr) {
        item.material.linewidth = 5;
        item.material = IDEF.selectedLineMaterial;
    });
  },

  resetLinkHighlighting: function(forSelect = false) {
    if (forSelect) {
      if (this.currentSelectedLink) {
        this.currentSelectedLink.forEach(function(item, i, arr) {
          item.material = IDEF.lineMaterial;
        });
        this.currentSelectedLink = null;
      }
    }
    else {
      if (this.currentHighlightedLink && this.currentHighlightedLink !== this.currentSelectedLink) {
        this.currentHighlightedLink.forEach(function(item, i, arr) {
          item.material = IDEF.lineMaterial;
        });
        this.currentHighlightedLink = null;
      }
    }
  },

  addLinkToObjects: function(link) {
    this.linkObjectA[this.arrowTypeA].links.push(link);
    this.linkObjectB[this.arrowTypeB].links.push(link);

    link.pointA = this.linkObjectA[this.arrowTypeA].arrowTip;
    link.pointB = this.linkObjectB[this.arrowTypeB].arrowTip;

    link.objectA = this.linkObjectA;
    link.objectB = this.linkObjectB;

    link.arrowA = this.linkObjectA[this.arrowTypeA];
    link.arrowB = this.linkObjectB[this.arrowTypeB];

    this.links.push(link);

  },

  updateLinksForObject: function(object) {

    var links;
    for (var arrowTypeIndex in this.arrowTypes) {
      if (object[IDEF.arrowTypes[arrowTypeIndex]]) {
        links = object[IDEF.arrowTypes[arrowTypeIndex]].links;
        
        for (var linkIndex in links) {
          IDEF.updateLink(object, IDEF.arrowTypes[arrowTypeIndex], links[linkIndex]);
        }
      }
    }
  },

  updateLink: function(movingObject, arrowType, link) {
    if (link.objectA == movingObject) {
      link.pointA.x = movingObject[arrowType].arrowTip.x;
      link.pointA.y = movingObject[arrowType].arrowTip.y;
      link.pointA.z = movingObject[arrowType].arrowTip.z;
    }
    if (link.objectB == movingObject) {
      link.pointB.x = movingObject[arrowType].arrowTip.x;
      link.pointB.y = movingObject[arrowType].arrowTip.y;
      link.pointB.z = movingObject[arrowType].arrowTip.z;
    }

    this.updateLinesOfLink(link);
  },

  updateLinesOfLink: function(link) {
    link[0].geometry.vertices[0].x = link.pointA.x;
    link[0].geometry.vertices[0].y = link.pointA.y;
    link[0].geometry.vertices[0].z = link.pointA.z;
    link[0].geometry.vertices[1].x = link.pointB.x;
    link[0].geometry.vertices[1].y = link.pointA.y;
    link[0].geometry.vertices[1].z = link.pointA.z;
    link[0].geometry.verticesNeedUpdate = true;

    link[1].geometry.vertices[0].x = link.pointB.x;
    link[1].geometry.vertices[0].y = link.pointA.y;
    link[1].geometry.vertices[0].z = link.pointA.z;
    link[1].geometry.vertices[1].x = link.pointB.x;
    link[1].geometry.vertices[1].y = link.pointA.y;
    link[1].geometry.vertices[1].z = link.pointB.z;
    link[1].geometry.verticesNeedUpdate = true;

    link[2].geometry.vertices[0].x = link.pointB.x;
    link[2].geometry.vertices[0].y = link.pointA.y;
    link[2].geometry.vertices[0].z = link.pointB.z;
    link[2].geometry.vertices[1].x = link.pointB.x;
    link[2].geometry.vertices[1].y = link.pointB.y;
    link[2].geometry.vertices[1].z = link.pointB.z;
    link[2].geometry.verticesNeedUpdate = true;
  },

  updateEditModeLine: function(mouse) {
    this.currentEditModeLine.geometry.vertices[1].x = mouse.x;
    this.currentEditModeLine.geometry.vertices[1].y = mouse.y;
    this.currentEditModeLine.geometry.vertices[1].z = mouse.z;
    this.currentEditModeLine.geometry.verticesNeedUpdate = true;
  },

  arePointsCoordEqual: function(point1, point2) {
    return point1.x == point2.x && point1.y == point2.y && point1.z == point2.z;
  },

  resetEditModeLine: function() {
    this.currentEditModeLine.geometry.vertices[0].x = 0;
    this.currentEditModeLine.geometry.vertices[0].y = 0; 
    this.currentEditModeLine.geometry.vertices[0].z = 0;
    this.currentEditModeLine.geometry.vertices[1].x = 0;
    this.currentEditModeLine.geometry.vertices[1].y = 0; 
    this.currentEditModeLine.geometry.vertices[1].z = 0;
    this.currentEditModeLine.geometry.verticesNeedUpdate = true; 
  },

  resetLinkConnectionPoints: function() {
    if (this.currentSelectedConnectionPointA != null || this.currentSelectedConnectionPointB != null) {
      this.currentSelectedConnectionPointA = null;
      this.linkObjectA = null;
      this.arrowTypeA = null;
      this.currentSelectedConnectionPointB = null;
      this.linkObjectB = null;
      this.arrowTypeB = null;
      console.log("resetting connection points");


    }
  },

  highlightObject: function(object, forSelect = false) {
      if (forSelect) {
        if (this.selectHighlightedObject != object) {
          this.resetHighlighting(true);
          this.resetLinkHighlighting(true);

          this.selectHighlightedObject = object;
          this.selectHighlightedEdges = new THREE.EdgesHelper(object, this.selectHighlightColor);
          this.selectHighlightedEdges.material.linewidth = 3;
          this.scene.add(this.selectHighlightedEdges);
          
          this.drawHighlightArrowsForObject(object, true);
        }
      }
      else {
        if (this.hoverHighlightedObject == null || this.hoverHighlightedObject != object) {
          
          if (this.hoverHighlightedEdges != null) {
              this.scene.remove(this.hoverHighlightedEdges);
              this.hoverHighlightedEdges = null; 
              this.resetHighlightedArrows(this.hoverHighlightedArrows);
              this.resetConnectionPoints(this.hoveredConnectionPoints);
          }
          
          this.hoverHighlightedObject = object;

          if (this.hoverHighlightedObject != this.selectHighlightedObject) {
            
            if (this.hoverHighlightedEdges != null) {
              this.scene.remove(this.hoverHighlightedEdges);
              this.hoverHighlightedEdges = null; 
              this.resetHighlightedArrows(this.hoverHighlightedArrows);
              this.resetConnectionPoints(this.hoveredConnectionPoints);
            }

            // highlight edges
            this.hoverHighlightedEdges = new THREE.EdgesHelper(object, this.hoverHighlightColor);
            this.hoverHighlightedEdges.material.linewidth = 3;
            this.scene.add(this.hoverHighlightedEdges);

            this.drawHighlightArrowsForObject(object);
          }
        }
      }

    
  },

  drawHighlightArrowsForObject: function(object, forSelect = false) {
    var context, color, connectionPoints;
    if (forSelect) {
      context = this.selectHighlightedArrows;
      color = this.selectHighlightColor;
      connectionPoints = this.selectedConnectionPoints;
      this.resetConnectionPoints(this.hoveredConnectionPoints);
    }
    else {
      context = this.hoverHighlightedArrows;
      color = this.hoverHighlightColor;
      connectionPoints = this.hoveredConnectionPoints;
    }

    var objectPos = object.position.clone();
    var oldPosX = objectPos.x;
    var oldPosY = objectPos.y;
    var oldPosZ = objectPos.z;

    var point, arrowTip;
    
    /////////////////////////////////////////////////////////////////////////////////

    objectPos.z = oldPosZ - (this.cubeSize / 2 + this.arrowSize);

    // if object hasn't had the fixed CONTROL arrow yet
    if (!object[this.CONTROL]) {
      context.controlsArrow = this.drawArrow(objectPos, this.dirOz, this.arrowSize, color);
    }
    else {
      var links = object[this.CONTROL].links;

      this.scene.remove(object[this.CONTROL]);

      object[this.CONTROL] = this.drawArrow(objectPos, this.dirOz, this.arrowSize, color);
      object[this.CONTROL].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    
    objectPos.z = oldPosZ - this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.controlsArrow ? object[this.CONTROL] : context.controlsArrow);
    point.parentArrow.arrowType = this.CONTROL;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.CONTROL].arrowTip : arrowTip);
    connectionPoints.push(point);

    ///////////////////////////////////////////////////////////////////////////////////
    
    objectPos.z = oldPosZ + (this.cubeSize / 2 + this.arrowSize);

    if (!object[this.MECHANISM]) {
      context.mechanismsArrow = this.drawArrow(objectPos, this.invDirOz, this.arrowSize, color);
    }
    else {
      var links = object[this.MECHANISM].links;

      this.scene.remove(object[this.MECHANISM]);

      object[this.MECHANISM] = this.drawArrow(objectPos, this.invDirOz, this.arrowSize, color);
      object[this.MECHANISM].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    
    objectPos.z = oldPosZ + this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.mechanismsArrow ? object[this.MECHANISM] : context.mechanismsArrow);
    point.parentArrow.arrowType = this.MECHANISM;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.MECHANISM].arrowTip : arrowTip);
    connectionPoints.push(point);

    /////////////////////////////////////////////////////////////////////////////////////

    objectPos.z = oldPosZ;
    
    objectPos.x = oldPosX - (this.cubeSize / 2 + this.arrowSize);
    
    if (!object[this.INPUT]) {
      context.inputsArrow = this.drawArrow(objectPos, this.dirOx, this.arrowSize, color);
    }
    else {
      var links = object[this.INPUT].links;

      this.scene.remove(object[this.INPUT]);

      object[this.INPUT] = this.drawArrow(objectPos, this.dirOx, this.arrowSize, color);
      object[this.INPUT].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    
    objectPos.x = oldPosX - this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.inputsArrow ? object[this.INPUT] : context.inputsArrow);
    point.parentArrow.arrowType = this.INPUT;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.INPUT].arrowTip : arrowTip);
    connectionPoints.push(point);

    ///////////////////////////////////////////////////////////////////////////////////////

    objectPos.x = oldPosX + this.cubeSize / 2;

    if (!object[this.OUTPUT]) {
      context.outputsArrow = this.drawArrow(objectPos, this.dirOx, this.arrowSize, color);
    }
    else {
      var links = object[this.OUTPUT].links;

      this.scene.remove(object[this.OUTPUT]);

      object[this.OUTPUT] = this.drawArrow(objectPos, this.dirOx, this.arrowSize, color);
      object[this.OUTPUT].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    arrowTip.x = oldPosX + this.cubeSize / 2 + this.arrowSize;
    
    objectPos.x = oldPosX + this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.outputsArrow ? object[this.OUTPUT] : context.outputsArrow);
    point.parentArrow.arrowType = this.OUTPUT;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.OUTPUT].arrowTip : arrowTip);
    connectionPoints.push(point);

    ////////////////////////////////////////////////////////////////////////////////////////

    objectPos.x = oldPosX;

    objectPos.y = oldPosY + (this.cubeSize / 2 + this.arrowSize);

    if (!object[this.FROM_PARENT]) {
      context.fromParentArrow = this.drawArrow(objectPos, this.invDirOy, this.arrowSize, color);
    }
    else {
      var links = object[this.FROM_PARENT].links;

      this.scene.remove(object[this.FROM_PARENT]);

      object[this.FROM_PARENT] = this.drawArrow(objectPos, this.invDirOy, this.arrowSize, color);
      object[this.FROM_PARENT].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    
    objectPos.y = oldPosY + this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.fromParentArrow ? object[this.FROM_PARENT] : context.fromParentArrow);
    point.parentArrow.arrowType = this.FROM_PARENT;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.FROM_PARENT].arrowTip : arrowTip);
    connectionPoints.push(point);

    //////////////////////////////////////////////////////////////////////////////////////////////

    objectPos.y = oldPosY - this.cubeSize / 2;
    
    if (!object[this.TO_CHILD]) {
      context.toChildArrow = this.drawArrow(objectPos, this.invDirOy, this.arrowSize, color);
    }
    else {
      var links = object[this.TO_CHILD].links;

      this.scene.remove(object[this.TO_CHILD]);

      object[this.TO_CHILD] = this.drawArrow(objectPos, this.invDirOy, this.arrowSize, color);
      object[this.TO_CHILD].links = links;

      if (forSelect)
        this.startArrowObject = object;
    }

    arrowTip = objectPos.clone();
    arrowTip.y = oldPosY - this.cubeSize / 2 - this.arrowSize;
    
    objectPos.y = oldPosY - this.cubeSize / 2;
    point = this.drawConnectionPoint(objectPos, this.normalConnectionPointColor);
    point.parentCube = object;
    point.parentArrow = (!context.toChildArrow ? object[this.TO_CHILD] : context.toChildArrow);
    point.parentArrow.arrowType = this.TO_CHILD;
    point.parentArrow.arrowTip = (!arrowTip ? object[this.TO_CHILD].arrowTip : arrowTip);
    connectionPoints.push(point);
  },

  removeIDEFFunction: function(object) {
    this.resetEditModeLine();

    if (object === this.selectHighlightedObject) {
      this.resetHighlighting(true);
    }

    if (object === this.hoverHighlightedObject) {
      this.resetHighlighting(); 
    }

    var removeIndex = this.objects.map(function(item) { return item.idefId; }).indexOf(object.idefId);

    // remove all links of this object
    this.arrowTypes.forEach(function(item, i, arr) {
      if (object[item] && object[item].links && object[item].links.length) {
        object[item].links.forEach(function(item1, i1, arr1) {
          IDEF.removeLink(item1);
        });
      }
    });

    // remove object
    this.objects.splice(removeIndex, 1);

    this.scene.remove(object);
  },

  removeLink: function(link) {
      if (link === this.currentSelectedLink) {
        this.resetLinkHighlighting(true);
      }

      if (link === this.currentHighlightedLink) {
        this.resetLinkHighlighting();
      }


      this.linkLines = this.linkLines.filter(function(item) {
        return item.parentLink.idefId !== link.idefId;
      });

      link.forEach(function(item, i, arr) {
        IDEF.scene.remove(item);
      });

      var removeIndex = this.links.map(function(item) { return item.idefId; }).indexOf(link.idefId);

      // remove object
      this.links.splice(removeIndex, 1);


      var remInd = link.arrowA.links.map(function(item) { return item.idefId; }).indexOf(link.idefId);
      link.arrowA.links.splice(remInd, 1);

      remInd = link.arrowB.links.map(function(item) { return item.idefId; }).indexOf(link.idefId);
      link.arrowB.links.splice(remInd, 1);

      if (link.arrowA.links && link.arrowA.links.length == 0) {
        console.log("remove arrowA");
        IDEF.scene.remove(link.arrowA);
      }

      if (link.arrowB.links && link.arrowB.links.length == 0) {
        console.log("remove arrowB");
        IDEF.scene.remove(link.arrowB);
      }

      link = null;
  },

  resetHighlightedArrows: function(highlightedArrows) {
    for (var key in highlightedArrows) {
      IDEF.scene.remove(highlightedArrows[key]);
      highlightedArrows[key] = null;
    }
  },

  resetConnectionPoints: function(connectionPoints) {
    connectionPoints.forEach(function(item, i, arr) {
      IDEF.scene.remove(item);
    });
    connectionPoints.length = 0;
  },

  resetHighlighting: function(forSelect = false) {
    if (forSelect) {
      if (this.selectHighlightedEdges != null) {
        this.scene.remove(this.selectHighlightedEdges);
        this.selectHighlightedEdges = null;
        this.selectHighlightedObject = null;
        this.resetHighlightedArrows(this.selectHighlightedArrows);
        this.resetConnectionPoints(this.selectedConnectionPoints);
      }
    }
    else {
      if (this.hoverHighlightedEdges != null) {
        this.scene.remove(this.hoverHighlightedEdges);
        this.hoverHighlightedEdges = null;
        this.hoverHighlightedObject = null;
        this.resetHighlightedArrows(this.hoverHighlightedArrows);
        this.resetConnectionPoints(this.hoveredConnectionPoints);
      }
    }
  },

  showTooltip: function(object, e) {
    if (object) {
      this.tooltip.innerHTML = object.name;
      this.tooltip.style.display = "inline-block";
      this.tooltip.style.left = e.clientX + 'px';
      this.tooltip.style.top = e.clientY + 'px';
    }
  },

  hideTooltip: function() {
    this.tooltip.style.display = "none";
  },

  addSkybox: function() {
    var iSBrsize = 500;
    var uniforms = {
      topColor: {type: "c", value: new THREE.Color(0x0077ff)}, bottomColor: {type: "c", value: new THREE.Color(0xffffff)},
      offset: {type: "f", value: iSBrsize}, exponent: {type: "f", value: 1.5}
    }

    var skyGeo = new THREE.SphereGeometry(iSBrsize, 32, 32);
    skyMat = new THREE.ShaderMaterial({vertexShader: sbVertexShader, fragmentShader: sbFragmentShader, uniforms: uniforms, side: THREE.DoubleSide, fog: false});
    skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyMesh);
  },
  
  selectIDEFFunctionItemForAdding: function(event) {
    this.selectedForAdding = true;
    console.log('item selected for adding');
  },
  
  addIDEFFunctionItem: function(event) {
    var clicked3DPoint = IDEF.getMouse3DPoint(event);

    var object, material;
    var objGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    material = new THREE.MeshPhongMaterial({color: IDEF.objectsColor});
    material.transparent = true;
    object = new THREE.Mesh(objGeometry.clone(), material);
    object.name = "FUNC#" + this.objects.length;
    object.idefId = this.commonIDEFFuncId;
    this.commonIDEFFuncId++;

    this.objects.push(object);

    object.scale.x = this.cubeSize;
    object.scale.y = this.cubeSize;
    object.scale.z = this.cubeSize;

    object.position.x = clicked3DPoint.x;
    object.position.y = clicked3DPoint.y;
    object.position.z = clicked3DPoint.z;

    this.highlightObject(object);
    this.showTooltip(object, event);

    this.scene.add(object);
  },

  onDocumentMouseDown: function (event) {

    
      // Get mouse position
      var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      // Get 3D vector from 3D mouse position using 'unproject' function
      var vector = new THREE.Vector3(mouseX, mouseY, 1);
      vector.unproject(IDEF.camera);

      // Set the raycaster position
      IDEF.raycaster.set( IDEF.camera.position, vector.sub( IDEF.camera.position ).normalize() );


      // Find all intersected connection points
      var intersectConnectionPoints = IDEF.raycaster.intersectObjects(IDEF.hoveredConnectionPoints.concat(IDEF.selectedConnectionPoints));

      if (intersectConnectionPoints.length > 0) {
        // Disable the controls
        IDEF.controls.enabled = false;

        // Set the selection - first intersected object
        IDEF.selectConnectionPointToLink(intersectConnectionPoints[0].object);
        
        // Calculate the offset
        var intersectConnectionPoints = IDEF.raycaster.intersectObject(IDEF.planeMesh);

        IDEF.offset.copy(intersectConnectionPoints[0].point).sub(IDEF.planeMesh.position);
      }
      

        // Find all intersected cubes
        var intersectCubes = IDEF.raycaster.intersectObjects(IDEF.objects);

        if (intersectCubes.length > 0) {
          // Disable the controls
          IDEF.controls.enabled = false;

          // Set the selection - first intersected object
          IDEF.selection = intersectCubes[0].object;

          IDEF.highlightObject(IDEF.selection, true);


          // Calculate the offset
          var intersectCubes = IDEF.raycaster.intersectObject(IDEF.planeMesh);

          if (intersectCubes.length > 0) {
            IDEF.offset.copy(intersectCubes[0].point).sub(IDEF.planeMesh.position);
          }
        }
        else {

          // Find all intersected links
          var intersectLinks = IDEF.raycaster.intersectObjects(IDEF.linkLines);

          if (intersectLinks.length > 0) {
            // Disable the controls
            IDEF.controls.enabled = false;

            // Set the selection - first intersected object
            IDEF.selectLink(intersectLinks[0].object.parentLink);

          }

        }

      


      if (IDEF.selectedForAdding) {
        IDEF.scene.remove(IDEF.transparentCube);
            
        IDEF.transparentCubeAddedToScene = false;
        IDEF.selectedForAdding = false;

        if (intersectConnectionPoints.length == 0 && intersectCubes.length == 0) {  
          IDEF.addIDEFFunctionItem(event);

          console.log('selected item is added');
        }
      }

      
    
  },

  transparentCubeAddedToScene: false,
  
  onDocumentMouseMove: function (event) {
    event.preventDefault();

    // Get mouse position
    var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    // Get 3D vector from 3D mouse position using 'unproject' function
    var vector = new THREE.Vector3(mouseX, mouseY, 1);
    vector.unproject(IDEF.camera);

    if (IDEF.selectedForAdding) {
        var pos = IDEF.getMouse3DPoint(event);

        IDEF.transparentCube.position.x = pos.x;
        IDEF.transparentCube.position.y = pos.y;
        IDEF.transparentCube.position.z = pos.z;

        IDEF.scene.add(IDEF.transparentCube);
    }
    else {

      // if connection start point is clicked - turning on editing mode
      if (IDEF.currentSelectedConnectionPointA != null) {
        IDEF.updateEditModeLine(vector);
      }

      // Set the raycaster position
      IDEF.raycaster.set( IDEF.camera.position, vector.sub( IDEF.camera.position ).normalize() );

      // if we drag object
      if (IDEF.selection) {
        IDEF.resetLinkConnectionPoints();
        IDEF.resetEditModeLine();
        IDEF.hideTooltip();

        // Check the position where the plane is intersected
        var intersects = IDEF.raycaster.intersectObject(IDEF.planeMesh);
        // Reposition the object based on the intersection point with the plane
        IDEF.selection.position.copy(intersects[0].point.sub(IDEF.offset));

        // redraw arrows while object is moving
        IDEF.resetHighlightedArrows(IDEF.selectHighlightedArrows);
        IDEF.resetHighlightedArrows(IDEF.hoverHighlightedArrows);
        IDEF.resetConnectionPoints(IDEF.selectedConnectionPoints);
        IDEF.resetConnectionPoints(IDEF.hoveredConnectionPoints);
        IDEF.drawHighlightArrowsForObject(IDEF.selection, true);

        // update all links for object we drag
        IDEF.updateLinksForObject(IDEF.selection);

      } else {

        var intersectHoveredConnectionPoints = IDEF.raycaster.intersectObjects(IDEF.hoveredConnectionPoints.concat(IDEF.selectedConnectionPoints));
        if (intersectHoveredConnectionPoints.length > 0) {
          var point = intersectHoveredConnectionPoints[0].object;
          
          if (point != IDEF.currentHoveredConnectionPoint) {
            IDEF.currentHoveredConnectionPoint = point;
            IDEF.currentHoveredConnectionPoint.material.color.setHex(IDEF.hoveredConnectionPointColor);
          }
        }
        else {
          if (IDEF.currentHoveredConnectionPoint != null) { 
            IDEF.currentHoveredConnectionPoint.material.color.setHex(IDEF.normalConnectionPointColor);
            IDEF.currentHoveredConnectionPoint = null;
          }
        }


        var intersectLinks = IDEF.raycaster.intersectObjects(IDEF.linkLines);
        if (intersectLinks.length > 0) {
          var line = intersectLinks[0].object;
          
          IDEF.highlightLink(line.parentLink);
          IDEF.showTooltip(line.parentLink, event);

          
        }
        else {
          IDEF.resetLinkHighlighting();
          IDEF.hideTooltip();
        

          var intersectCubes = IDEF.raycaster.intersectObjects(IDEF.objects);
          if (intersectCubes.length > 0) {
            var obj = intersectCubes[0].object;
            
            IDEF.highlightObject(obj);
            IDEF.showTooltip(obj, event);

            IDEF.planeMesh.position.copy(obj.position);
            IDEF.planeMesh.lookAt(IDEF.camera.position);
          }
          else {
            IDEF.resetHighlighting();
            IDEF.hideTooltip();
          }
        }
      }
    }
  },
  
  onDocumentMouseUp: function (event) {
    // Enable the controls
    IDEF.controls.enabled = true;

    if (IDEF.selection) {
      IDEF.showTooltip(IDEF.selection, event);
    }

    IDEF.selection = null;
  },

  pointToString: function(point) {
    if (!point) {
      return "(undefined)";
    }
    return "(" + point.x + ", " + point.y + ", " + point.z + ")";
  }
};

// Animate the scene
function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

// Update controls and stats
function update() {
  var delta = IDEF.clock.getDelta();

  IDEF.controls.update(delta);
  IDEF.stats.update();
}

// Render the scene
function render() {
  if (IDEF.renderer) {
    IDEF.renderer.render(IDEF.scene, IDEF.camera);
  }
  if (IDEF.composer) {
    IDEF.composer.render();
  }
}

// Initialize lesson on page load
function initializeLesson() {
  IDEF.init();
  animate();
}

if (window.addEventListener)
  window.addEventListener('load', initializeLesson, false);
else if (window.attachEvent)
  window.attachEvent('onload', initializeLesson);
else window.onload = initializeLesson;