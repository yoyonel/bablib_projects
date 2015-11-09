// Define used GLSL version
#version 120

// Uniform parameters (=global)
uniform mat4 worldTransform;
uniform mat4 worldInverseTransform;
uniform mat4 modelViewMat;
uniform mat4 projectionMat;
//
uniform vec3 cameraPosition;

varying vec3 vNormalVertex;
varying mat3 normalMatrix;
varying vec3 vViewDirection, vColor;
varying vec2 vTexCoords;

// - For Cube Reflector
//vec4 vertexPosition = gl_Vertex;
//vec3 vertexNormal = gl_Normal;

// - For Lemming Reflector
// Current vertex attributes
attribute vec4 vertexPosition;
attribute vec3 vertexNormal;
attribute vec3 vertexColor;
attribute vec2 vertexTexCoords;
//
attribute vec3 vertexTangent, vertexBinormal;
	
float bumpScale = 0.3;

void main(void) {
	mat3 rotations = mat3(worldTransform[0].xyz, worldTransform[1].xyz, worldTransform[2].xyz );			
	
	normalMatrix[0]  = rotations*vertexTangent;
    normalMatrix[0] *= bumpScale;        
    normalMatrix[1]  = rotations*vertexBinormal;
    normalMatrix[1] *= bumpScale;
    normalMatrix[2]  = rotations*vertexNormal;
      
    vNormalVertex = vertexNormal;
	vTexCoords = vertexTexCoords;    
    
    vec3 worldSpaceVertexPos = vec3(worldInverseTransform * vec4(vertexPosition.xyz, 1));
        
    vViewDirection = worldSpaceVertexPos - cameraPosition;
    
    vColor = vertexColor;
    
    gl_Position     = projectionMat * modelViewMat * vertexPosition;
}