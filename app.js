import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3} from "../../libs/MV.js";
import {modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60;         // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

//Tilemap
const LIGHT_GREY = vec3(0.5,0.5,0.5);
const DARK_GREY = vec3(0.2,0.2,0.2);
const nTiles = 16.0;

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

    mode = gl.TRIANGLES; 

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

    gl.clearColor(0.6, 0.1, 0.1, 1.0);

    //Initialize all used primitives
    CUBE.init(gl);
    SPHERE.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);

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

    function SingleWheel(wheel_posY){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.09,0.09,0.09)));
        const wheel_length = 1.0;
        
        multTranslation([0.0,wheel_posY,0.0]);
        multScale([wheel_length,wheel_length*2,wheel_length]);

        uploadModelView();

        TORUS.draw(gl, program, mode);
    }
    
    function Axis(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.4,0.5,0.09)));
        const axis_length = 0.3;
        const axis_height = 13.35;
        
        multScale([axis_length,axis_length*axis_height,axis_length]);

        uploadModelView();

        CYLINDER.draw(gl, program, mode);
    }

    function WheelAndAxis(){
        const distance = 2;
        pushMatrix();
            SingleWheel(-distance);
        popMatrix();
        pushMatrix();
            SingleWheel(distance);
        popMatrix();
        pushMatrix();
            Axis();
        popMatrix();
    }

    function Wheels(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.09,0.09,0.09)));
        const distance = 1.5;
        for(let i = -2; i < 2; i++){
            pushMatrix();
                multTranslation([i*distance,0.65,0.0]);
                multRotationX(90.0);
                WheelAndAxis();
            popMatrix();
        }
    }

    function Tile(xFactor,zFactor){
        const cube_length = 1.0;

        multScale([cube_length,cube_length/5.0,cube_length]);
        multTranslation([xFactor*cube_length + cube_length/2,-cube_length/2.0,zFactor*cube_length+ cube_length/2]);
        
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function TileMap(n_tiles){
        for (var i = (-n_tiles/2) ; i < n_tiles/2 ; i++){
            for (var j = (-n_tiles/2) ; j < n_tiles/2 ; j++){
                const color = (i+j)%2==0 ? LIGHT_GREY: DARK_GREY;
                gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(color));
                pushMatrix();
                    Tile(i,j);
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
            TileMap(nTiles);
        popMatrix();
        pushMatrix();
            Wheels();
        popMatrix();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))