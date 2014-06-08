//var service_url = 'http://2048.semantics3.com';
//var service_url = 'http://localhost:2048';
var service_url = 'http://ring:2048';
var session_id = "";
var interval = 0;
var stop = false;
var score;

function view(obj) {
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      var num = obj.grid[i][j];
      if (num != 0) {
        $('#tb'+i+j).html("<p class='c2048'><span id='sp"+i+j+"'>"+num+"</span></p>");
        $('#sp'+i+j).css('color',tx_colors[num]);
        $('#sp'+i+j).css('font-size',tx_sizes[num]+'px');
        $('#tb'+i+j).css('background-color',colors[num]);
      } else {
        $('#tb'+i+j).html("");
        $('#tb'+i+j).css('background-color',"#FFF");
      }
    }
  }
  $('#score').html(obj.score);
  score = obj.score;
}

function run() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', service_url+'/hi/start/json');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      data = xhr.responseText;
      obj = JSON.parse(data);
      view(obj);
      session_id = obj.session_id;
      //console.log(session_id);
      setTimeout(function() {
        ai_run(obj.grid);
      },interval);
    }
  };
  xhr.send(null);
}

function dump(grid){
  var str = "[";
  for (var i = 0; i < 4; i++) {
    if (i) str += ", ";
    str += "[";
    for (var j = 0; j < 4; j++) {
      if (j) str += ", ";
      str += grid[i][j];
    }
    str += "]";
  }
  str += "]";
  return str;
}

function rotate(grid, direction) {
  for (var i = 0; i < direction; i++) {
    var new_grid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (var j = 0; j < 4; j++) {
      for (var k = 0; k < 4; k++) {
        new_grid[j][k] = grid[k][4 - j - 1];
      }
    }
    grid = new_grid;
  }
  return grid;
}

function move_impl(ary) {
  var joined = false;
  var point = 0;
  var moved = false;
  for (var i = 0; i < 4; i++) {
    if (ary[i] == 0) continue;
    var hit = false;
    for (var j = i - 1; j >= 0; j--) {
      if (ary[j] == 0) continue;
      if (ary[j] == ary[i] && !joined) {
        ary[j] *= 2;
        ary[i] = 0;
        joined = true;
        moved = true;
        point += ary[j];
      } else {
        if (j+1 != i) {
          ary[j+1] = ary[i];
          ary[i] = 0;
          moved = true;
        }
        joined = false;
      }
      hit = true;
      break;
    }
    if (i != 0 && !hit) {
      ary[0] = ary[i];
      ary[i] = 0;
      moved = true;
      joined = false;
    }
  }
  return {point:point,ary:ary,movable:moved};
}

function moveUp(grid) {
  var newgrid = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  var point = 0;
  var movable = false;
  for (var i = 0; i < 4; i++) {
    var ary = [0,0,0,0];
    for (var j = 0; j < 4; j++) {
      ary[j] = grid[j][i];
    }
    var ret = move_impl(ary);
    point += ret.point;
    if (ret.movable) movable = true;
    for (var j = 0; j < 4; j++) {
      newgrid[j][i] = ret.ary[j];
    }
  }
  return {point:point,grid:newgrid,movable:movable};
}

function move(grid, direction) {
  var newgrid = rotate(grid, direction);
  var ret = moveUp(newgrid);
  newgrid = rotate(ret.grid, 4 - direction - 1);
  return {point:ret.point,grid:newgrid,movable:ret.movable};
}

//   ||                          ||
//  \||/                        \||/
//   \/                          \/

function moveput(grid, dir) {
  var ret = move(grid, dir);
  var flag = 0;
  for (var i = 0; i < 4; i++)
    for (var j = 0; j < 4; j++)
      if (ret.grid[i][j] == 0) ret.grid[i][j] = 2;
  return ret;
}

function evaluate(grid) {
  var value1 = [[80,40,40,40],[30,10,10,10],[3,1,1,3],[1,1,1,1]];
  var value2 = [[40,40,40,80],[10,10,10,30],[3,1,1,3],[1,1,1,1]];
  //var slope1 = [[10,20,30,40],[80,70,50,40],[33,34,35,36],[100,99,98,95]];
  //var slope2 = [[40,30,20,10],[50,60,70,80],[36,35,34,33],[95,98,99,100]];
  var slope1 = [[10,11,12,13],[32,31,30,20],[33,34,35,36],[100,99,98,95]];
  var slope2 = [[13,12,11,10],[20,30,31,32],[36,35,34,33],[95,98,99,100]];
  //var slope1 = [[10,11,12,13],[50,40,30,20],[60,70,80,90],[100,99,98,95]];
  //var slope2 = [[13,12,11,10],[20,30,40,50],[90,80,70,60],[95,98,99,100]];
  //var slope2 = [[13,12,11,10],[],[],[]];
  var res1 = -1e10;
  var res2 = -1e10;
  var dir1 = 1;
  var dir2 = 1;
  for (var i = 0; i < 4; i++) {
    var score = evaluate_impl(grid, value1);
    if (res1 < score) {
      res1 = score;
      dir1 = i;
    }
    score = evaluate_impl(grid, value2);
    if (res2 < score) {
      res2 = score;
      dir2 = i;
    }
    value1 = rotate(value1, 1);
    value2 = rotate(value2, 1);
  }
  return Math.max(res1, res2);
  for (var i = 0; i < dir1; i++) slope1 = rotate(slope1, 1);
  var slopebonus1 = 100;
  for (var i = 0; i < 4; i++)
    for (var j = 0; j < 4; j++)
      for (var k = 0; k < 4; k++)
        for (var l = 0; l < 4; l++)
          if (slope1[i][j] > slope1[k][l] && grid[i][j] > grid[k][l])
            slopebonus1 = Math.min(slopebonus1, slope1[k][l]);
  for (var i = 0; i < dir2; i++) slope2 = rotate(slope2, 1);
  var slopebonus2 = 100;
  for (var i = 0; i < 4; i++)
    for (var j = 0; j < 4; j++)
      for (var k = 0; k < 4; k++)
        for (var l = 0; l < 4; l++)
          if (slope2[i][j] > slope2[k][l] && grid[i][j] > grid[k][l])
            slopebonus2 = Math.min(slopebonus2, slope2[k][l]);
  //console.log(slopebonus);
  return Math.max(slopebonus1 * res1, slopebonus2 * res2);
}

function evaluate_sub(grid) {
  var value1 = [[80,40,20,20],[40,20,10,20],[20,1,1,3],[1,1,1,1]];
  var value2 = [[20,20,40,80],[20,10,20,40],[3,1,1,20],[1,1,1,1]];
  //var value1 = [[80,40,40,40],[30,10,10,10],[3,1,1,3],[1,1,1,1]];
  //var value2 = [[40,40,40,80],[10,10,10,30],[3,1,1,3],[1,1,1,1]];
  var res = -1e10;
  for (var i = 0; i < 4; i++) {
    var score = evaluate_impl(grid, value1);
    if (res < score) res = score;
    score = evaluate_impl(grid, value2);
    if (res < score) res = score;
    value1 = rotate(value1, 1);
    value2 = rotate(value2, 1);
  }
  return 10 * res;
}

function evaluate_impl(value, grid) {
  var res = 0;
  var num = 0;
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      res += Math.pow(grid[i][j], 1.5) * value[i][j];
      if (grid[i][j] > 1) num++;
    }
  }
  var score = res;
  return score / num;
}

function recursive(grid, n) {
  if (n <= 0) return {score:0,num:1};
  var ret = 0;
  var num = 0;
  var score = 0;
  for (var i = 0; i < 4; i++) {
    var new_grid = moveput(grid, i);
    if (!new_grid.movable) continue;
    var rec = recursive(new_grid.grid, n-1);
    score = evaluate(new_grid.grid) + rec.score;
    num += rec.num;
    if (score > ret) ret = score;
  }
  return {score:ret,num:num};
}

function calc(grid) {
  //console.log("grid_begin: "+dump(grid));
  var maxp = -1e10;
  var maxi = -1;
  var num = 0;
  //var dep = depth(grid);
  var dep = 3;
  for (var i = 0; i < 4; i++) {
    var ret = moveput(grid, i);
    if (!ret.movable) continue;
    rec = recursive(ret.grid, dep);
    var dirnum = 1;
    var dircnt = 1;
    for (var y = 0; y < 4; y++) {
      for (var x = 0; x < 4; x++) {
        var rett = ret.grid;
        if (rett[y][x] == 0) {
          rett[y][x] = 2;
          dircnt++;
          for (var j = 0; j < 4; j++) {
            var rettt = move(rett, j);
              if (rettt.movable) dirnum++;
          }
        }
      }
    }
    //var score = rec.score * dirnum / dircnt;
    var score = rec.score * (Math.pow(dirnum / dircnt, 0.5) + 1);
    num += rec.num;
    if (maxp <= score) { maxp = score; maxi = i; }
  }
  //console.log("grid_end: "+dump(grid));
  //console.log("score: %f", maxp);
  //document.writeln(maxp+"<br>");
  if (maxi == -1) maxi = one;
  return maxi;
}

//   /\                          /\
//  /||\                        /||\
//   ||                          ||

function ai_run(grid) {
  var move_dir = calc(grid);
  //console.log("moveto: "+move_dir);
  var xhr = new XMLHttpRequest();
  var url = service_url+'/hi/state/'+session_id+'/move/'+move_dir+'/json';
  //console.log(url);
  xhr.open('GET', url);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var data = xhr.responseText;
      obj = JSON.parse(data);
      view(obj);
      if (!stop && !obj.over) {
        ai_run(obj.grid);
      }
      if (obj.over) {
        $('#scorelist').append($('<p>').text(score));
        run();
      }
    }
  };
  xhr.send(null);
}
