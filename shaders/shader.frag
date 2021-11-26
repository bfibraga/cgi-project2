precision highp float;

varying vec3 fNormal;
varying vec3 fColor;

void main() {
    float gray_scale = (fNormal.x + fNormal.y + fNormal.z)/3.0;
    float fractal_factor = 0.15;
    gl_FragColor = vec4(vec3(fColor.x - gray_scale*fractal_factor, fColor.y - gray_scale*fractal_factor, fColor.z - gray_scale*fractal_factor) , 1.0);
}