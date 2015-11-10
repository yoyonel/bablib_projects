#version 130

out vec3 v3_normal;

void main(void) {
    gl_Position = gl_Vertex;
    v3_normal   = gl_Normal;
}
