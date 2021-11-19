import { mat4, mult, translate, scalem, rotateX, rotateY, rotateZ } from "../../../libs/MV.js";

export {stack, pushMatrix, popMatrix, multMatrix, multTranslation, multScale, multRotationX, multRotationY, multRotationZ};

const stack = {
    matrixStack: [],
    modelView: mat4()
};

// Stack related operations
function pushMatrix() {
    var m =  mat4(stack.modelView[0], stack.modelView[1],
           stack.modelView[2], stack.modelView[3]);
    stack.matrixStack.push(m);
}
function popMatrix() {
    stack.modelView = stack.matrixStack.pop();
}
// Append transformations to modelView
function multMatrix(m) {
    stack.modelView = mult(stack.modelView, m);
}
function multTranslation(t) {
    stack.modelView = mult(stack.modelView, translate(t));
}
function multScale(s) { 
    stack.modelView = mult(stack.modelView, scalem(s)); 
}
function multRotationX(angle) {
    stack.modelView = mult(stack.modelView, rotateX(angle));
}
function multRotationY(angle) {
    stack.modelView = mult(stack.modelView, rotateY(angle));
}
function multRotationZ(angle) {
    stack.modelView = mult(stack.modelView, rotateZ(angle));
}