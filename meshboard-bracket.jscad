// title      : meshboardBracket
// author     : John Cole
// license    : ISC License
// file       : meshboardBracket.jscad

/* exported main, getParameterDefinitions */

function getParameterDefinitions() {
  var parts = {
    top_left: 'top left',
    top_right: 'top right',
    bottom_left: 'bottom left',
    bottom_right: 'bottom right',
    assembled: 'assembled',
    exploded: 'exploded',
  };

  return [
    {
      name: 'resolution',
      type: 'choice',
      values: [0, 1, 2, 3, 4],
      captions: [
        'very low (6,16)',
        'low (8,24)',
        'normal (12,32)',
        'high (24,64)',
        'very high (48,128)',
      ],
      initial: 2,
      caption: 'Resolution:',
    },
    {
      name: 'part',
      type: 'choice',
      values: Object.keys(parts),
      captions: Object.keys(parts).map(function(key) {
        return parts[key];
      }),
      initial: 'exploded',
      caption: 'Part:',
    },
  ];
}

function main(params) {
  var resolutions = [[6, 16], [8, 24], [12, 32], [24, 64], [48, 128]];
  CSG.defaultResolution3D = resolutions[params.resolution][0];
  CSG.defaultResolution2D = resolutions[params.resolution][1];
  util.init(CSG);

  var inch = util.inch;

  var meshboard = util.group();

  meshboard.add(
    Parts.Cube([inch(12), inch(14), 2]).center('xy').color('green'),
    'board'
  );

  meshboard.add(
    Parts.Cube([10, 22.5, 7.5])
      .snap(meshboard.parts.board, 'x', 'inside+')
      .snap(meshboard.parts.board, 'y', 'inside-')
      .snap(meshboard.parts.board, 'z', 'outside-')
      .translate([0, 3, 0])
      .color('black'),
    'switch'
  );

  meshboard.add(
    Parts.Cylinder(6, 7.5)
      .snap(meshboard.parts.board, 'x', 'inside+')
      .snap(meshboard.parts.board, 'y', 'inside+')
      .snap(meshboard.parts.board, 'z', 'outside-')
      .translate([-2, -8, 0])
      .color('gray'),
    'cap'
  );

  var mb2 = meshboard
    .clone()
    .snap('board', meshboard.parts.board, 'y', 'outside+')
    .translate([0, -5, 0]);

  var mb2clear = mb2.parts.board.stretch('z', 20, 0);

  var bracket = Parts.RoundedCube(26, 26, 12, 5)
    .snap(meshboard.parts.board, 'x', 'inside+')
    .snap(meshboard.parts.board, 'y', 'inside-')
    .translate([15, -15, -6])
    .subtract(meshboard.parts.board.stretch('z', 20, 0).translate([0, 2, -5]))
    // .subtract(mb2clear)
    .subtract(mb2clear.translate([0, -2, -5]))
    .subtract(meshboard.parts.board.enlarge(0, 0, 0.5).color('red'))
    .subtract(mb2.parts.board.enlarge(0, 0, 0.5));

  var bracket2 = bracket.bisect('y', 12.5);
  var bracket3 = bracket2.parts.positive.bisect('z');
  var keyshape = CAG.fromPoints([[0, 0], [5, 0], [4, 4], [1, 4]]);

  var key = util
    .poly2solid(keyshape, keyshape, 10)
    .rotateX(90)
    .rotateZ(90)
    .align(bracket2.parts.positive, 'y')
    .snap(bracket2.parts.positive, 'x', 'inside+')
    .snap(bracket2.parts.positive, 'z', 'inside+')
    .translate([0, 0, -6])
    .intersect(bracket)
    .color('green');

  var rail = Parts.Cube([26, 1, 1])
    .fillet(0.5, 'z+')
    .rotateX(-90)
    .align(bracket3.parts.positive, 'xz')
    .snap(bracket3.parts.positive, 'y', 'outside-');

  // var center = bracket.calcCenter();

  // var brackettop = bracket2.parts.positive.bisect('z', 7);

  var easment = Boxes.BBox(bracket3.parts.positive).enlarge(0.5, 0.5, 0.5);

  var parts = {
    top_right: function() {
      return union([rail, key, bracket3.parts.positive])
      .color('yellow')
      .chamfer(0.5, 'z-');
    },
    top_left: function() {
      return parts.top_right().mirroredX();
    },
    bottom_right: function() {
      return union([
        bracket2.parts.negative.subtract([
          easment,
          rail.enlarge(0.5, 0.5, 0.5).stretch('x', 5).translate([-2.5, 0, 0]),
        ]),
        bracket3.parts.negative.subtract([easment, key.enlarge(0.5, 0.5, 0.5)]),
      ]).chamfer(0.4, 'z-');
    },
    bottom_left: function() {
      return parts.bottom_right().mirroredX();
    },
    assembled: function() {
      return ['bottom_right', 'top_right'].map(part => parts[part]());
    },
    exploded: function() {
      var gap = 2;
      var explparts = [
        'bottom_right',
        'bottom_left',
        'top_right'
      ].reduce(
        function(partarr, partname, idx) {
          var part = parts[partname]();
          if (partarr.length == 0) {
            partarr.push(part.Zero());
            return partarr;
          } else {
            partarr.push(part.snap(partarr[idx - 1], 'x', 'outside+').translate([-gap, 0, 0]).Zero());
            return partarr;
          }
        },
        []
      );
      
      explparts.push(parts['top_left']().snap(explparts[2], 'y', 'outside-').translate([0, gap, 0]).align(explparts[2], 'x').Zero());
      
      return explparts;
    },
  };

  var part = parts[params.part]();
  return Array.isArray(part) ? union(part).center('xy').Zero() : part.center();
}

// ********************************************************
// Other jscad libraries are injected here.  Do not remove.
// Install jscad libraries using NPM
// ********************************************************
// include:js
// endinject
