import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, vec3, vec4, add, mult, subtract, normalize, inverse, normalMatrix, scale} from "../../libs/MV.js";
import {modelView, loadMatrix, multMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationX, multRotationZ} from "../../libs/stack.js";

import * as SPHERE from '../../libs/sphere.js';
import * as CUBE from '../../libs/cube.js';
import * as TORUS from '../../libs/torus.js';
import * as CYLINDER from '../../libs/cylinder.js';
import * as PRISM from './prism.js';

/** @type WebGLRenderingContext */
let gl;

let time = 0;           // Global simulation time in days
let speed = 1/60;         // Speed (how many days added to time on each render pass
let mode;            // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

//---Tilemap---
const LIGHT = rgb(58,76,58); //vec3(58/255,76/255,58/255);
const DARK = rgb(38,56,36); //vec3(38/255,56/255,36/255);
const nTiles = 25.0;
const cube_length = 1.0;
const cube_height = cube_length/6.0;

//---Tank---

//Wheels
const nWheels = 5;
const wheel_length = 1.5;
const alloy_length = 0.2;
const alloy_height = ((wheel_length + 0.2*wheel_length)/2.0)/wheel_length;

const axis_length = wheel_length/3.0;
const axis_height = 4.5;

const wheel_x_distance = (axis_height/2.0);
const wheel_y_distance = (wheel_length+2*0.2*wheel_length)+0.1;

var wheel_angle = 0.0;
const distance = 0.07;
const angle_travel = distance / 2*(wheel_length + 0.2*(wheel_length));

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

//Turret
const turret_height = 1.5;
const front_turret_length = 2.0;
const back_turret_length = 3.5;

//Entrance
const entrance_length = 2.0;
const entrance_height = 0.1;
const final_entrance_length = Math.min(back_turret_length-0.5,entrance_length);

//Canon
const canon_length = 7.0;
const canon_width = 0.6;
let canon_rx = 90;
let canon_ry = 90;
const canon_x_max = 90;
const canon_x_min = 40;

//Tank
let tank_pos = [0.0,wheel_length/2.0 + 0.19*wheel_length,0.0];

//Projectiles
let mModelView;
let mView;
let worldCordinates;
let projectiles = []; 
const projectile_radious = canon_width*5.0/6.0;
const velocity = 8.0;
const gravity = 9.88;
const acceleration = vec4(0.0, -gravity, 0.0, 0.0);

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

function rgb(r,g,b){
    return vec3(r/255, g/255, b/255);
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
                break;
            case 'ArrowUp':
                if(tank_pos[0] < (nTiles/2 - wheel_y_distance*nWheels/2.0)){
                    tank_pos[0] += distance;
                    wheel_angle -= angle_travel;
                }
                break;
            case 'ArrowDown':
                if(tank_pos[0] > (-nTiles/2 + wheel_y_distance*nWheels/2.0 )){
                    tank_pos[0] -= distance;
                    wheel_angle += angle_travel;
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
        mProjection = ortho(-camera_distance*aspect,camera_distance*aspect, -camera_distance, camera_distance,-3*camera_distance,3*camera_distance);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function Alloy(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(120,118,82)));

        multScale([alloy_height, alloy_length, alloy_height]);
        
        uploadModelView();
        
        CYLINDER.draw(gl, program, mode);
    }

    function Tire(wheel_posY){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(10,10,10)));
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
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(50,50,50)));
        
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
        for(let i = -nWheels/2; i < nWheels/2; i++){
            pushMatrix();
                multTranslation([i*wheel_y_distance+wheel_y_distance/2.0,0.0,0.0]);
                multRotationX(90.0);
                WheelAndAxis();
            popMatrix();
        }
    }

    function BottomBase(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(150,145,100)));
        
        multScale([base_width,base_height,base_length]);

        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function Capot(pos, rotation, scale){
        multTranslation(pos);
        multRotationY(rotation);
        multScale(scale);
        uploadModelView();
            
        PRISM.draw(gl, program, mode);
    }

    function TopBase(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(175,165,120)));

        //Top Shell
        pushMatrix();
            multScale([top_shell_width,top_shell_height,top_shell_length+wheel_length/2.0]);
                
            uploadModelView();

            CUBE.draw(gl, program, mode);
        popMatrix();
                
        pushMatrix();
            //Front Capot
            Capot([(3.0*top_shell_width/4.0) - final_top_shell_x_offset/2.0, 0.0, 0.0], -90, [top_shell_length + wheel_length/2.0, top_shell_height,(base_width-top_shell_width)/2.0 - final_top_shell_x_offset]);
        popMatrix();

        pushMatrix();
            //Back Capot
            Capot([-(3.0*top_shell_width/4.0) - final_top_shell_x_offset/2.0, 0.0, 0.0], 90, [top_shell_length + wheel_length/2.0, top_shell_height,(base_width-top_shell_width)/2.0 + final_top_shell_x_offset]);
        popMatrix();
    }

    function Base(){

        pushMatrix();
            BottomBase();
        popMatrix();
        multTranslation([final_top_shell_x_offset,(base_height+top_shell_height)/2.0,0.0]);
        pushMatrix();
            TopBase();
    }

    function Projectile(pos){

        multTranslation(pos);
        multScale([projectile_radious,projectile_radious,projectile_radious]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Projectiles(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(95,110,105)));
        for(let i = 0; i < projectiles.length; i++){
            let projectile = projectiles[i];
            projectile["velocity"] = add(projectile["velocity"], scale(speed, acceleration));

            projectile["pos"] = add(projectile["pos"], add(scale(0.5*speed*speed, acceleration),scale(speed, projectile["velocity"])));
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

    function Canon(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(122,109,60)));
        
        pushMatrix();
            //Canon Base
            multTranslation([0.0,canon_length/2.0,0.0]);
            pushMatrix();
                multScale([canon_width, canon_length, canon_width]);

                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            popMatrix();

            //Canon Tip
            gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(30,30,30)));
            pushMatrix();
                multTranslation([0.0,turret_height/2.0-canon_length/2.0,0.0]);
                multScale([canon_width+0.1,canon_length/4.0,canon_width+0.1]);
                
                uploadModelView();

                CYLINDER.draw(gl, program, mode);
            popMatrix();

            //Canon Tube
            pushMatrix();
                multTranslation([0.0,canon_length/2.0,0.0]);
                multScale([canon_width+0.05,1.0,canon_width+0.05]);
                
                uploadModelView();

                CUBE.draw(gl, program, mode);
            popMatrix();
        popMatrix();
    }

    function Turret(){
        gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(157,143,88)));
        
        multTranslation([0.0,(turret_height+top_shell_height)/2.0,0.0])
    
        multRotationY(canon_ry);
        
        //Front part
        pushMatrix();
            multTranslation([0.0,0.0,front_turret_length/2.0]);
            multRotationY(180);
            multScale([top_shell_length, turret_height, front_turret_length]);

            uploadModelView();

            PRISM.draw(gl, program, mode);
        popMatrix();

        //Back part
        pushMatrix();
            multTranslation([0.0,0.0,-back_turret_length/2.0]);
            multScale([top_shell_length, turret_height, back_turret_length]);

            uploadModelView();

            CUBE.draw(gl, program, mode);
        popMatrix();

        //Tank Entrance
        pushMatrix();
            gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(rgb(90,80,60)));
            multTranslation([0.0, (turret_height/2.0) ,-back_turret_length/2.0]);
            multScale([final_entrance_length, entrance_height, final_entrance_length]);

            uploadModelView();

            CYLINDER.draw(gl, program, mode);
        popMatrix();
        
        multTranslation([0.0,canon_width/2.0,0.0]);

        //Canon
        pushMatrix();
            multRotationX(canon_rx);
            
            //Saves last modelview matrix
            mModelView = modelView();
            worldCordinates = mult(inverse(mView), mModelView);

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
        popMatrix();
    }

    function Tile(x,z){
        multTranslation([x*cube_length + cube_length/2, -cube_height/2.0, z*cube_length+ cube_length/2]);
        multScale([cube_length,cube_height,cube_length]);
        
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