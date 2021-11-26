precision highp float;

varying vec3 fNormal;
varying vec3 fColor;

void main() {
    float gray_scale = (fNormal.x + fNormal.y + fNormal.z)/3.0;
    gl_FragColor = vec4(fColor.x - gray_scale/20.0, fColor.y - gray_scale/20.0, fColor.z - gray_scale/20.0 , 1.0);
}