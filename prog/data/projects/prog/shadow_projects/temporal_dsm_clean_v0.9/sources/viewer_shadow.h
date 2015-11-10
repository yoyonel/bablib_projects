/****************************************************************************

Copyright (C) 2002-2007 Gilles Debunne (Gilles.Debunne@imag.fr)

This file is part of the QGLViewer library.
Version 2.2.6-3, released on August 28, 2007.

http://artis.imag.fr/Members/Gilles.Debunne/QGLViewer

libQGLViewer is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

libQGLViewer is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with libQGLViewer; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*****************************************************************************/

#ifndef __TEST_SM__
#define __TEST_SM__

#ifdef _WIN32
#include <windows.h>
#endif

#include <GL/glew.h>
#include <GL/gl.h>

#include <QGLViewer/qglviewer.h>
#include <QGLViewer/manipulatedFrame.h>
#include <QGLViewer/manipulatedCameraFrame.h>

#include <stdio.h>	// # fprintf
using namespace std;

#include <ProgGLSL.h>
#include <Texture.h>
#include <FrameBuffer.h>

#define __DEBUG__
#include "helper_preprocess.h"

//#include "TimerQueryNV.h"
//
#include <scene3d/TriSoup.h>
#include <VertexBuffer.h>

// [eSize=2] => Lecture/Ecriture
// Lecture: résultat précédent
// Ecriture: résultat courant (en cours de calcul)
typedef enum { 
	eRead = 0, 
	eWrite, 
	eSize 		// = 2
} eTypeReadWrite;

#define INVERT_RW( _rw ) ((_rw == eRead) ? eWrite : eRead)

class Viewer : public QGLViewer {
public:
        Viewer();
        ~Viewer();
        
protected :
	virtual void draw();
	virtual void init();
        virtual void keyPressEvent(QKeyEvent *e);	
	
private :

	// - INIT
	void initAll( bool bDestroy = false );
	//
	void initShadowMap( bool bDestroy = false );
	//
	void initTextures( bool bDestroy = false );
	void initFrameBuffers( bool bDestroy = false );
	void initShaders( bool bDestroy = false );
	//
	void initTimerQueryNV( bool bDestroy = false );
	//
	void initVBO( bool bDestroy = false );
	void initTriSoup( bool bDestroy = false );

	// - DESTROY
	void destroyAll();
	void destroyTextures();
	void destroyFrameBuffers();
	void destroyShaders();
	//
	void destroyTimerQueryNV();
	//
	void destroyVBO();
	void destroyTriSoup();
	
	// - UPDATE
	void updateFrameBuffers();
	void updateShadowMap( 
			FrameBuffer& 		_fb_, 
		const 	qglviewer::Camera& 	_qgl_cam_light
	);
	void updateShadowClipMap( 
			FrameBuffer& 		_fb_, 
			Texture& 		_tex_sm, 
		const 	qglviewer::Camera& 	_qgl_cam_light,
		const 	qglviewer::Camera 	_qgl_cam_eyes[eSize]
	);
	
	void setOpenGLStates();
	
	bool checkFrameBufferStatus();
	
	// - DRAW
	void drawScene();
	void drawQuad(float sz, float texc = 1.f);
	void drawTexture( int x, int y, int w, int h, ProgGLSL& _prog);
	void drawSpiral();
	void drawLightCamera( float _fCoef_Alpha = 0.5f );
	void drawTextures();
	
private :
	bool bFirstInit;
	
	// FRAMEBUFFERS/TEXTURES BabLib
	FrameBuffer 	fb_depth_shadow_map;
	Texture		tex_shadow_map;

	eTypeReadWrite 	eCurrentFrame;
	//
	FrameBuffer 	fb_shadow_clipmap[eSize];
	Texture 	tex_shadow_clipmap[eSize];
	Texture 	tex_shadow_clipmap_current;
	Texture		tex_history_visibility;
	//
	Texture 	tex_positions_ws[eSize];
	Texture		tex_history_positions;
	//
	Texture		texture_active;
	
	// SHADERS BabLib
	ProgGLSL prog_depth_shadow_map;
	ProgGLSL prog_draw_texture;
	ProgGLSL prog_draw_scene_with_scm;
	//
	ProgGLSL prog_vbo_dsm;	// rendu du vbo pour la depth shadow map (texture de profondeur)
	ProgGLSL prog_vbo_scm;	// rendu du vbo utilisant la depth shadow map (texture de luminosité => shadow clip map)

	// CAMERAS QGLViewer
	qglviewer::Camera qgl_cam_light;
	qglviewer::Camera qgl_cam_light_rand;
	qglviewer::Camera qgl_cam_eyes[eSize];
	
	// TIMERS [ EXT: disponible sur NVidia, pas (pas encore chez) ATI/AMD :'( ]
	// - FBDSM: FrameBuffer Depth Shadow Map
	//CTimerQueryNV 	tq_update_shadow_map,
	//		tq_update_shadow_clip_map;

	// VBO
	// - loader
	TriSoup *ts;
	// - VBO OpenGL
	VertexDataBufferGL *vbo;
	IndexBufferUI *indexBuffer;
	// - VBO interface QGLViewer, manipulation de l'object
	qglviewer::ManipulatedFrame qgl_mf_vbo;
	float	f_scale_vbo;
};

#endif

