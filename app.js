import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, add, mult, subtract, normalize, inverse, normalMatrix, scale} from "../../libs/MV.js";
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
let mode;            // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

//---Tilemap---
const LIGHT = vec3(200/255,200/255,200/255);
const DARK = vec3(30/255,30/255,30/255);
const nTiles = 50.0;
const cube_length = 1.0;
const cube_height = cube_length/6.0;

//---Tank---

const tank_scale = 1.0;

//Wheels
const nWheels = 5;
const wheel_length = 1.5;
const alloy_length = 0.3;
const alloy_height = 0.7;

const axis_length = wheel_length/3.0;
const axis_height = 4.0;

const wheel_x_distance = axis_height/2.0;
const wheel_y_distance = wheel_length+2*0.2*wheel_length+0.1;

var wheel_angle = 0.0;
const distance = 0.01*tank_scale;
const angle_travel = distance / 2*(wheel_length*tank_scale + 0.2*(wheel_length*tank_scale));

//Body
//Base
const base_length = axis_height;
const base_height = 1.0*(wheel_length+0.4*wheel_length)/2.0;
const base_width = (nWheels)*wheel_y_distance+wheel_y_distance/2.0;

const top_shell_length = base_length;
const top_shell_height = 1.0;
const top_shell_width = base_width/2;
const top_shell_x_offset = -1.5;
const final_top_shell_x_offset = Math.max(-((base_width/2.0)-(top_shell_width/2.0)),
                                 Math.min(top_shell_x_offset,(base_width/2.0)-(top_shell_width/2.0)));

const front_shell_length = (base_length-top_shell_length)/2.0;
const front_shell_width = 1.0;

//Turret
const turret_length = Math.min(top_shell_width, top_shell_length)-0.2;
const turret_height = 3.0;

//Canon
const canon_length = 5.0;
const canon_width = 0.5;
let canon_rx = 90;
let canon_ry = 90;
const canon_x_max = 90;
const canon_x_min = 40;
const canon_x = 0.5;

//Tank
let tank_pos = [0.0,(wheel_length*tank_scale)/2.0 + 0.19*(wheel_length*tank_scale),0.0];

//Projectiles
let mModelView;
let mView;
let worldCordinates;
let projectiles = []; 
const projectile_radious = canon_width*tank_scale;
const velocity = 8.0*tank_scale;
const gravity = 9.88;
const accelaration = vec4(0.0, -gravity, 0.0, 0.0);

//Camera
let camera_distance = 7.0;
let camera_mode = "ISO";
let CAMERA_POS ={
    "ISO": { //Isometric
        "eye": [camera_distance, camera_distance, camera_distance],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, 
    "FRONT": { //Front
        "eye": [camera_distance, 0.0, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }, 
    "TOP": { //Top
        "eye": [0.0, camera_distance, 0.0],
        "at": [0.0,0.0,0.0],
        "up": [-1.0,0.0,0.0]
    }, 
    "PERFIL": { //Perfil
        "eye": [0.0, 0.0, camera_distance],
        "at": [0.0,0.0,0.0],
        "up": [0.0,1.0,0.0]
    }
}

function degrees(radians){
    return radians*180/Math.PI;
}

function updateCameraEye(new_value){
    CAMERA_POS["ISO"]["eye"] = [new_value, new_value, new_value];
    CAMERA_POS["FRONT"]["eye"] = [new_value, 0.0, 0.0];
    CAMERA_POS["TOP"]["eye"] = [0.0, new_value, 0.0];
    CAMERA_POS["PERFIL"]["eye"] = [0.0, 0.0, new_value];
}

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
                if(canon_rx > canon_x_min)
                    canon_rx--;
                break;
            case 'W':
                mode = gl.LINES;
                break;
            case 's':
                if(canon_rx < canon_x_max)
                    canon_rx++;
                break;
            case 'S':
                mode = gl.TRIANGLES;
                break;
            case 'a':
                canon_ry++;
                break;
            case 'd':
                canon_ry--;
                break;
            case ' ':
                const pos = vec4(0.0,canon_length,0.0,1.0)
                const pos_final = mult(worldCordinates, pos);
                
                const vel = vec4(0.0,velocity,0.0,0.0);
                const vel_final = mult(normalMatrix(worldCordinates), vel);
                projectiles.push({
                    "pos": pos_final,
                    "velocity": vel_final});
                console.log(projectiles[projectiles.length-1]);
                break;
            case 'ArrowUp':
                if(tank_pos[0] < (nTiles/2 - wheel_y_distance*nWheels/2.0)){
                    tank_pos[0] += distance;
                    wheel_angle -= angle_travel;
                    console.log(wheel_angle);
                }
                break;
            case 'ArrowDown':
                if(tank_pos[0] > (-nTiles/2 + wheel_y_distance*nWheels/2.0 )){
                    tank_pos[0] -= distance;
                    wheel_angle += angle_travel;
                    console.log(wheel_angle);
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
                if (camera_distance > 1.0){
                    camera_distance /= 1.05;
                    updateCameraEye(camera_distance);
                }
                break;
            case '-':
                camera_distance *= 1.05;
                updateCameraEye(camera_distance);
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
        multRotationY(degrees(wheel_angle));
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

    function Capot(pos, rotation, scale){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.3,0.3,0.3)));
        multTranslation(pos);
        multRotationY(rotation);
        multScale(scale);
        uploadModelView();
            
        PRISM.draw(gl, program, mode);
    }

    function TopBase(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.6,0.6,0.6)));
            
            pushMatrix();

                multScale([top_shell_width,top_shell_height,top_shell_length+wheel_length/2.0]);

                uploadModelView();

                CUBE.draw(gl, program, mode);
            popMatrix();
            
            pushMatrix();
                Capot([(3.0*top_shell_width/4.0) - final_top_shell_x_offset/2.0, 0.0, 0.0], -90, [top_shell_length + wheel_length/2.0, top_shell_height,(base_width-top_shell_width)/2.0 - final_top_shell_x_offset]);
            popMatrix();

            pushMatrix();
                Capot([-(3.0*top_shell_width/4.0) - final_top_shell_x_offset/2.0, 0.0, 0.0], 90, [top_shell_length + wheel_length/2.0, top_shell_height,(base_width-top_shell_width)/2.0 + final_top_shell_x_offset]);
            popMatrix();

            popMatrix();
    }

    function Base(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.2,0.2,0.2)));

        pushMatrix();
            BottomBase();
        popMatrix();
        multTranslation([final_top_shell_x_offset,(base_height+top_shell_height)/2.0,0.0]);
        pushMatrix();
            TopBase();
        popMatrix();
    }

    function Projectile(pos){

        multTranslation(pos);

        multScale([projectile_radious,projectile_radious,projectile_radious]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Projectiles(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.0,0.0,0.0)));
        for(let i = 0; i < projectiles.length; i++){
            let projectile = projectiles[i];
            projectile["velocity"] = add(projectile["velocity"], scale(speed, accelaration));

            projectile["pos"] = add(projectile["pos"], add(scale(0.5*speed*speed, accelaration),scale(speed, projectile["velocity"])));
            const pos = [projectile["pos"][0], projectile["pos"][1], projectile["pos"][2]];

            if(pos[1] >= 0.0){
                pushMatrix();
                Projectile(pos);
                popMatrix();
            }
            else{
                projectiles.splice(i,1);
            }
        }
    }

    function Canon(pos){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.7,0.1,0.0)));
        pushMatrix();
            multTranslation(pos);
            pushMatrix();
                multScale([canon_width, canon_length, canon_width]);

                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.6,0.0,0.0)));
                multTranslation([0.0,turret_height/2.0-canon_length/2.0,0.0]);
                multScale([canon_width+0.1,0.9,canon_width+0.1]);
                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            popMatrix();
            pushMatrix();
                multTranslation([0.0,canon_length/2.0,0.0]);
                multScale([0.5,0.9,0.5]);
                uploadModelView();

                CUBE.draw(gl, program, mode);
            popMatrix();
        popMatrix();
    }

    function Turret(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.5,0.2,0.7)));

        multTranslation([final_top_shell_x_offset,(base_height/2.0)+top_shell_height,0.0]);
        multRotationY(canon_ry);
        
        pushMatrix();
            multScale([turret_length, turret_height, turret_length]);

            uploadModelView();

            SPHERE.draw(gl, program, mode);
        popMatrix();

        pushMatrix();
            gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(vec3(0.0,0.1,0.8)));
            multTranslation([0.0,top_shell_height,0.0]);

            uploadModelView();

            CYLINDER.draw(gl, program, mode);
        popMatrix();
        
        multTranslation([0.0,canon_width/2.0,0.0]);


        pushMatrix();
            multRotationX(canon_rx);
            
            //Saves last modelview matrix
            mModelView = modelView();
            worldCordinates = mult(inverse(mView), mModelView);

            multTranslation([0.0,canon_length/2.0,0.0]);

            Canon([0.0,0.0,0.0]);
            //Canon([-canon_x,0.0,0.0])
            
            //Canon([-canon_x,0.0,0.0]);
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
        pushMatrix();
            multTranslation(tank_pos);
            multScale([tank_scale,tank_scale,tank_scale]);
            pushMatrix();
                Wheels();
            popMatrix();
            pushMatrix();
                Body();
            popMatrix();
        popMatrix();
    }

    function Tile(x,z){
        multScale([cube_length,cube_height,cube_length]);
        multTranslation([x*cube_length + cube_length/2,-cube_length/2.0,z*cube_length+ cube_length/2]);
        
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
        mView = lookAt(curr_cam_mode["eye"], curr_cam_mode["at"], curr_cam_mode["up"]);
        loadMatrix(mView);
        mProjection = ortho(-camera_distance*aspect,camera_distance*aspect, -camera_distance, camera_distance,-5*camera_distance,5*camera_distance);

        pushMatrix();
            TileMap();
        popMatrix();

        pushMatrix();
            Tank();
        popMatrix();
        pushMatrix();
            Projectiles();
        popMatrix();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))