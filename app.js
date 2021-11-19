import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3} from "../../libs/MV.js";
import {modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60;         // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

//Tilemap
const LIGHT_GREY = vec3(0.5,0.5,0.5);
const DARK_GREY = vec3(0.2,0.2,0.2);

//Camera
let zoom = 0.0;
const camera_distance = 5.0;
let camera_mode = "ISO";
const CAMERA_POS ={
    "ISO": {
        "eye": [camera_distance, camera_distance, camera_distance],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, //Isometric
    "FRONT": {
        "eye": [camera_distance, 0.0, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, //Front
    "TOP": {
        "eye": [0.0, camera_distance, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [-1.0,0.0,0.0]
    }, //Top
    "PERFIL": {
        "eye": [0.0, 0.0, camera_distance],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    } //Perfil
}

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-camera_distance*aspect,camera_distance*aspect, -camera_distance, camera_distance,-3*camera_distance,3*camera_distance);

    mode = gl.LINES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'w':
                break;
            case 'W':
                mode = gl.LINES;
                break;
            case 's':
                break;
            case 'S':
                mode = gl.TRIANGLES;
                break;
            case 'a':
                break;
            case 'd':
                break;
            case ' ':
                break;
            case 'ArrowUp':
                break;
            case 'ArrowDown':
                break;
            case '1':
                //Front view
                camera_mode = "FRONT";
                break;
            case '2':
                //Top view
                camera_mode = "TOP";
                break;
            case '3':
                //Perfil view
                camera_mode = "PERFIL";
                break;
            case '4':
                //Isometric view
                camera_mode = "ISO";
                break;
            case '+':
                zoom -= 0.5;
                break;
            case '-':
                zoom += 0.5;
                break;
        }
        console.log("Pressed " + event.key);
        console.log(zoom);
    }

    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    //Initialize all used primitives
    CUBE.init(gl);
    SPHERE.init(gl);

    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);


    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = ortho(-camera_distance*aspect,camera_distance*aspect, -camera_distance, camera_distance,-5*camera_distance,5*camera_distance);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function Wheel(wheel_pos){
        
        multTranslation(wheel_pos);
        //multScale([0.1,0.3,0.7]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Tile(tile_pos,tile_scale){
        
        multScale(tile_scale);
        multTranslation(tile_pos);
        
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function TileMap(n_tiles){
        const cube_length = 1.0;
        for (var i = (-n_tiles/2) ; i < n_tiles/2 ; i++){
            for (var j = (-n_tiles/2) ; j < n_tiles/2 ; j++){
                const color = (i+j)%2==0 ? LIGHT_GREY: DARK_GREY;
                gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(color));

                pushMatrix();
                    Tile([i*cube_length + cube_length/2,-cube_length/2.0,j*cube_length+ cube_length/2],[cube_length,cube_length/5.0,cube_length]);
                popMatrix();
            }
        }
    }

    function render()
    {
        if(animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));
    
        //Matrix camera
        const curr_cam_mode = CAMERA_POS[camera_mode];
        loadMatrix(lookAt(curr_cam_mode["eye"], curr_cam_mode["at"], curr_cam_mode["up"]));
        
        pushMatrix();
            TileMap(7.0);
        popMatrix();
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(1.0,1.0,1.0)));
        pushMatrix();
            Wheel([1.0,0.5,1.0]);
        popMatrix();
        pushMatrix();
            Wheel([-1.0,0.5,-2.0]);
        popMatrix();
        /*pushMatrix();
            Sun();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MERCURY_YEAR);
            multTranslation([MERCURY_ORBIT, 0, 0]); 
            Mercury();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/VENUS_YEAR);
            multTranslation([VENUS_ORBIT, 0, 0]); 
            Venus();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/EARTH_YEAR);
            multTranslation([EARTH_ORBIT, 0, 0]);
            EarthMoon();
        popMatrix();*/

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))