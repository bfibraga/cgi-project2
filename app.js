import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, add} from "../../libs/MV.js";
import {modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PRISM from '../../libs/prism.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60;         // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

//---Tilemap---
const LIGHT = vec3(58/255,76/255,58/255);
const DARK = vec3(38/255,56/255,36/255);
const nTiles = 25.0;
const cube_length = 1.0;
const cube_height = cube_length/6.0;

//---Tank---
//Axis
const axis_length = 0.3;
const axis_height = 4;

//Wheels
const nWheels = 5;
let distance = 0.1;
const wheel_length = 1.0;
const wheel_circunference = wheel_length * Math.PI;
const wheel_velocity = wheel_circunference / distance;
var wheel_pos = 0.0;
const wheel_x_distance = axis_height/2.0;
const wheel_y_distance = 1.5;
const alloy_length = 0.3;
const alloy_height = 0.7;

//Body
//Base
const base_length = axis_height;
const base_height = 1.0;
const base_width = 8.0;

const top_shell_length = base_length;
const top_shell_height = 1.0;
const top_shell_width = base_width/2;

const front_shell_length = 1.0;
const front_shell_width = 1.0;

//Turret
const turret_length = top_shell_width-0.5;
const turret_height = 3.0;

//Canon
const canon_length = 2.0;
const canon_width = 0.15;
let canon_rx = 90;
let canon_ry = 90;

//Tank
let tank_pos = [0.0,wheel_length/2.0 + 0.19*wheel_length,0.0];

//Camera
let zoom = 0.0;
let camera_distance = 7.0;
let camera_mode = "ISO";
const CAMERA_POS ={
    "ISO": { //Isometric
        "eye": [camera_distance, camera_distance, camera_distance],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, 
    "FRONT": { //Front
        "eye": [camera_distance+nTiles/2.0, 0.0, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, 
    "TOP": { //Top
        "eye": [0.0, camera_distance+nTiles/2.0, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [-1.0,0.0,0.0]
    }, 
    "PERFIL": { //Perfil
        "eye": [0.0, 0.0, camera_distance+nTiles/2.0],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    } 
}

let camera_coords = CAMERA_POS[camera_mode]["eye"];

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-(camera_distance+nTiles)*aspect,(camera_distance+nTiles)*aspect, -(camera_distance+nTiles), (camera_distance+nTiles),-3*(camera_distance+nTiles),3*(camera_distance+nTiles));

    mode = gl.TRIANGLES; 
    camera_mode = "ISO";

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) {
        switch(event.key) {
            case 'w':
                //if(canon_inclination < 120)
                    canon_rx++;
                    console.log(canon_rx);
                break;
            case 'W':
                mode = gl.LINES;
                break;
            case 's':
                //if(canon_rx <= 90)
                    canon_rx--;
                    console.log(canon_rx);
                break;
            case 'S':
                mode = gl.TRIANGLES;
                break;
            case 'a':
                canon_ry++;
                console.log(canon_ry);
                break;
            case 'd':
                canon_ry--;
                console.log(canon_ry);
                break;
            case ' ':
                break;
            case 'ArrowUp':
                if(tank_pos[0] > (-nTiles/2 + wheel_y_distance * 3)){
                    tank_pos[0] -= distance;
                    wheel_pos -= wheel_velocity;
                }
                break;
            case 'ArrowDown':
                if(tank_pos[0] < (nTiles/2 - wheel_y_distance * 3)){
                    tank_pos[0] += distance;
                    wheel_pos += wheel_velocity;
                }
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
                zoom += 0.5;
                break;
            case '-':
                zoom -= 0.5;
                break;
        }
    }

    gl.clearColor(165/255, 205/255, 222/255, 1.0);

    //Initialize all used primitives
    CUBE.init(gl);
    SPHERE.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);
    PRISM.init(gl);

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

    function Alloy(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.7,0.5,0.1)));

        multScale([alloy_height, alloy_length, alloy_height]);
        
        uploadModelView();
        
        CYLINDER.draw(gl, program, mode);
    }

    function Tire(wheel_posY){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.09,0.09,0.09)));
        
        multTranslation([0.0,wheel_posY,0.0]);
        multScale([wheel_length,wheel_length*2,wheel_length]);

        uploadModelView();

        TORUS.draw(gl, program, mode);
    }

    function SingleWheel(wheel_posY){
        Tire(wheel_posY);
        pushMatrix();
            Alloy();
        popMatrix();
    }
    
    function Axis(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.4,0.5,0.09)));
        
        
        multScale([axis_length,axis_height,axis_length]);

        uploadModelView();

        CYLINDER.draw(gl, program, mode);
    }

    function WheelAndAxis(){
        multRotationY(wheel_pos);
        pushMatrix();
            SingleWheel(-wheel_x_distance);
        popMatrix();
        pushMatrix();
            SingleWheel(wheel_x_distance);
        popMatrix();
        pushMatrix();
            Axis();
        popMatrix();
    }

    function Wheels(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.09,0.09,0.09))); 
        for(let i = -nWheels/2; i < nWheels/2; i++){
            pushMatrix();
                multTranslation([i*wheel_y_distance+wheel_y_distance/2.0, 0.0 ,0.0]);
                multRotationX(90.0);
                WheelAndAxis();
            popMatrix();
        }
    }

    function BottomBase(){
        multScale([base_width,base_height,base_length]);

        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function TopBase(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.6,0.6,0.6)));
            //multTranslation([0.0,1.6-base_height/2.0,0.0]);
            
            pushMatrix();

                multScale([top_shell_width,top_shell_height,top_shell_length+wheel_length/2.0]);

                uploadModelView();

                CUBE.draw(gl, program, mode);
            popMatrix();

            let front_shell_pos = [(top_shell_width + front_shell_width)/2.0, 0.0, 0.0];
            const curr_width = (base_width-top_shell_width)/2.0;
            const angle = 90;

            //angle = Math.tan(curr_height/curr_width);

            front_shell_pos[0] += curr_width/4.0;
            
            pushMatrix();
                multTranslation(front_shell_pos);
                multRotationY(-angle);
                multScale([top_shell_length + wheel_length/2.0 ,top_shell_height,curr_width]);
                uploadModelView();
            
                PRISM.draw(gl, program, mode);
            popMatrix();

            front_shell_pos[0] *= -1;

            pushMatrix();
                multTranslation(front_shell_pos);
                multRotationY(angle);
                multScale([top_shell_length + wheel_length/2.0 ,top_shell_height,curr_width]);
                uploadModelView();
            
                PRISM.draw(gl, program, mode);
            popMatrix();
    }

    function Base(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.7,0.7,0.7)));

        pushMatrix();
            BottomBase();
        popMatrix();
        multTranslation([0.0,(base_height+top_shell_height)/2.0,0.0]);
        pushMatrix();
            TopBase();
        popMatrix();
    }

    function Canon(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.8,0.2,0.1)));
            
        multScale([canon_width, canon_length, canon_width]);

        uploadModelView();

        CYLINDER.draw(gl, program, mode);
    }

    function Turret(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.5,0.2,0.7)));

        multRotationY(canon_ry);
        
        multTranslation([0.0,top_shell_height/2.0,0.0]);
        multScale([turret_length, turret_height, turret_length]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
        
        multTranslation([0.0,canon_width/2.0,0.0]);
        pushMatrix();
            multRotationX(canon_rx+50*time);
            multTranslation([0.0,1.0,0.0]);
            Canon();
        popMatrix(); 
    }

    function Body(){
        multTranslation([0.0, base_height/2.0, 0.0]);
        pushMatrix();
            Base();
        pushMatrix();
            Turret();
        popMatrix();
    }

    function Tank(){
        multTranslation(tank_pos);
        pushMatrix();
            Wheels();
        popMatrix();
        pushMatrix();
            Body();
        popMatrix();
    }

    function Tile(xFactor,zFactor){
        multScale([cube_length,cube_height,cube_length]);
        multTranslation([xFactor*cube_length + cube_length/2,-cube_length/2.0,zFactor*cube_length+ cube_length/2]);
        
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function TileMap(){
        for (var i = (-nTiles/2) ; i < nTiles/2 ; i++){
            for (var j = (-nTiles/2) ; j < nTiles/2 ; j++){
                const color = (i+j)%2==0 ? LIGHT: DARK;
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
        let cam_pos = vec3(curr_cam_mode["eye"][0] - zoom, curr_cam_mode["eye"][1] - zoom, curr_cam_mode["eye"][2] - zoom );
        loadMatrix(lookAt(cam_pos, curr_cam_mode["at"], curr_cam_mode["up"]));

        pushMatrix();
            TileMap();
        popMatrix();
        pushMatrix();
            Tank();
        popMatrix();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))