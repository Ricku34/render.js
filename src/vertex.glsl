#version 300 es
in vec2 vertex;

void main(void) {
	gl_Position.xy = vertex;
	gl_Position.z = 0.0;
	gl_Position.w = 1.0;
}