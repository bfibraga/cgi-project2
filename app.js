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

let zoom = 5;

const LIGHT_GREY = vec3(0.5,0.5,0.5);
const DARK_GREY = vec3(0.2,0.2,0.2);

function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-zoom*aspect,zoom*aspect, -zoom, zoom,-3*zoom,3*zoom);

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
                break;
            case '2':
                break;
            case '3':
                break;
            case '4':
                break;
            case '+':
                break;
            case '-':
                break;
        }
        console.log("Pressed " + event.key);
        console.log(zoom);
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

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
        mProjection = ortho(-zoom*aspect,zoom*aspect, -zoom, zoom,-5*zoom,5*zoom);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    /*function Sun()
    {
        // Don't forget to scale the sun, rotate it around the y axis at the correct speed
        // ..
        multScale([SUN_DIAMETER, SUN_DIAMETER, SUN_DIAMETER]);
        multRotationY(360*time/SUN_DAY);

        // Send the current modelview matrix to the vertex shader
        uploadModelView();

        // Draw a sphere representing the sun
        SPHERE.draw(gl, program, mode);
    }

    function Mercury(){

        multScale([MERCURY_DIAMETER, MERCURY_DIAMETER, MERCURY_DIAMETER]);
        multRotationY(360*time/MERCURY_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Venus(){

        multScale([VENUS_DIAMETER, VENUS_DIAMETER, VENUS_DIAMETER]);
        multRotationY(360*time/VENUS_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Earth(){

        multScale([EARTH_DIAMETER, EARTH_DIAMETER, EARTH_DIAMETER]);
        multRotationY(360*time/EARTH_DAY);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function Moon(){
        multScale([MOON_DIAMETER, MOON_DIAMETER, MOON_DIAMETER]);

        uploadModelView();

        SPHERE.draw(gl, program, mode);
    }

    function EarthMoon(){
        pushMatrix();
            Earth();
        popMatrix();
        pushMatrix();
            multRotationY(360*time/MOON_YEAR);
            multTranslation([MOON_ORBIT, 0,0]);
            Moon();
        popMatrix();
    }*/

    function Tile(tile_pos,tile_scale){
        
        multScale(tile_scale);
        multTranslation(tile_pos);
        
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    function TileMap(n_tiles, cube_length){
        for (var i = -n_tiles/2; i < n_tiles/2 ; i++){
            for (var j = -n_tiles/2 ; j < n_tiles/2 ; j++){
                const color = (i+j)%2==0 ? LIGHT_GREY: DARK_GREY;
                gl.uniform3fv(gl.getUniformLocation(program, "uColor"), flatten(color));
                
                pushMatrix();
                    Tile([i*cube_length,0,j*cube_length],[cube_length,cube_length/5.0,cube_length]);
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
        loadMatrix(lookAt([zoom,zoom/2,zoom], [0,0,0], [0,1,0]));
        
        pushMatrix();
            TileMap(20.0,1.0);
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