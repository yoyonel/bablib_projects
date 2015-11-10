#ifndef __HELPER_VIEWER_INIT_H__
#define __HELPER_VIEWER_INIT_H__

#include <ColorTypes.h>
#include <Message.h>

// trisoup/
#include <scene3d/Tri.h>
#include <scene3d/TriSoup.h>
#include <VertexBuffer.h>

void Viewer::initAll( bool bDestroy )
{
	// - TEXTURES
	// - FRAMEBUFFERS
	initShadowMap( bDestroy );

	// - SHADERS
	initShaders( bDestroy );

	// -
	//initTimerQueryNV( bDestroy );

	// -
	initTriSoup( bDestroy );
	// -
	initVBO( bDestroy );
}

void Viewer::initShadowMap( bool bDestroy )
{		
	initTextures(bDestroy);		// 
	initFrameBuffers(bDestroy);		//

	MSG_CHECK_GL;
}

void Viewer::initTextures( bool bDestroy ) 
{
	if ( bDestroy ) {
		destroyTextures();		
	}
	
	// -- first shadow depth texture
	tex_shadow_map = Texture::createTex2DShadow( 
		PARAM(int, texture.dsm.width), 			// width
		PARAM(int, texture.dsm.height), 		// height
		PARAM(GLenum, texture.dsm.internalformat), 	// internalFormat
		PARAM(GLenum, texture.dsm.filter),		// texture filter
		PARAM(GLenum, texture.dsm.wrapmode)		// wrap mode
		);
	tex_shadow_map.setBorderColor( PARAM(Float4, texture.dsm.border_color) );

	// -- second shadow clip map texture
	for(int i=0; i<eSize; ++i) {
	// 
		tex_shadow_clipmap[i] = Texture::createTex2D( 
			PARAM(int, 	texture.scm.width), 
			PARAM(int, 	texture.scm.height), 
			PARAM(GLenum, 	texture.scm.internalformat),
			PARAM(GLenum, 	texture.scm.filter),		// texture filter
			PARAM(GLenum, 	texture.scm.wrapmode)
			);
		tex_shadow_clipmap[i].setBorderColor( PARAM(Float4, texture.scm.border_color) );
		//
		tex_positions_ws[i] = Texture::createTex2D( 
			PARAM(int, 	texture.pws.width), 
			PARAM(int, 	texture.pws.height), 
			PARAM(GLenum, 	texture.pws.internalformat),
			PARAM(GLenum, 	texture.pws.filter),		// texture filter
			PARAM(GLenum, 	texture.pws.wrapmode)
			);
		//
		fprintf(stderr, "tex_shadow_clipmap[%d]: init\n", i);
		fprintf(stderr, "tex_positions_ws[%d]: init\n", i);
	}

 	MSG_CHECK_GL;
}

void Viewer::initFrameBuffers( bool bDestroy )
{
	if ( bDestroy ) {
		destroyFrameBuffers();
	}
	
	// - FrameBuffer pour rendre la Depth Shadow Map (render_to_depth_texture)
	fb_depth_shadow_map = FrameBuffer::create_TexDepth( &tex_shadow_map, false );
	fb_depth_shadow_map.checkCompleteness(false);

	// - FrameBuffer pour rendre la shadow clip map
	//fb_shadow_clipmap[eWrite] = FrameBuffer::create_Tex2D_Z( &tex_shadow_clipmap[eRead] );
	// eRead  = 0
	// eWrite = 1
	for(int i=0; i<eSize; ++i) {
		const int eInvRW = INVERT_RW(i);
		//
		fb_shadow_clipmap[i] = FrameBuffer( tex_shadow_clipmap[eInvRW].getWidth(), tex_shadow_clipmap[eInvRW].getHeight());
		fb_shadow_clipmap[i].create();
		//
		fb_shadow_clipmap[i].attachTex2D(GL_COLOR_ATTACHMENT0_EXT, &tex_shadow_clipmap[eInvRW], 0, false);
		fb_shadow_clipmap[i].attachTex2D(GL_COLOR_ATTACHMENT1_EXT, &tex_positions_ws[eInvRW], 	0, false);
		//
		fb_shadow_clipmap[i].attachRenderBuffer(GL_DEPTH_ATTACHMENT_EXT,  GL_DEPTH_COMPONENT24);
		//
		fb_shadow_clipmap[i].checkCompleteness(true);
		//
		fb_shadow_clipmap[i].activate();
		{
			glClearColor(0, 0, 0, 1);
			//
			glClear( GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);		
		}
		fb_shadow_clipmap[i].deactivate();
		//
		fprintf(stderr, "fb_shadow_clipmap[%d]: color0 = tex_shadow_clipmap[%d]\n", i, eInvRW);
		fprintf(stderr, "fb_shadow_clipmap[%d]: color1 = tex_positions_ws[%d]\n", i, eInvRW);
	}	

	eCurrentFrame = eRead;

 	MSG_CHECK_GL;
}

void Viewer::initShaders( bool bDestroy ) 
{
	if ( bDestroy ) {
		destroyShaders();
	}
	
	LOADDIRSHADER( PARAM(QString, shaderDir.depth_shadow_map), prog_depth_shadow_map );
	prog_depth_shadow_map.addTexture("shadowMap", &tex_shadow_map, false);
	
	LOADDIRSHADER( PARAM(QString, shaderDir.draw_texture), prog_draw_texture );
	prog_draw_texture.addTexture("texture", &texture_active);
	
	LOADDIRSHADER( PARAM(QString, shaderDir.draw_scene_with_scm), prog_draw_scene_with_scm );
	prog_draw_scene_with_scm.addTexture( "tex_scm", &tex_shadow_clipmap_current );
	
	LOADDIRSHADER( PARAM(QString, shaderDir.vbo_dsm), prog_vbo_dsm );

	LOADDIRSHADER( PARAM(QString, shaderDir.vbo_scm), prog_vbo_scm );
	prog_vbo_scm.addTexture("shadowMap", &tex_shadow_map, false);
	//
	prog_vbo_scm.addTexture("tex_history_visibility", &tex_history_visibility, false );
	prog_vbo_scm.addTexture("tex_history_positions", &tex_history_positions, false );
	//
	MSG_CHECK_GL;
}

	/*
void Viewer::initTimerQueryNV( bool bDestroy )
{
	if ( bDestroy ) {
		destroyTimerQueryNV();
	}

	tq_update_shadow_map.init();
	tq_update_shadow_clip_map.init();

	MSG_CHECK_GL;
}
*/

void Viewer::initTriSoup( bool bDestroy )
{
	if ( bDestroy ) {
		destroyTriSoup();
	}

	ts = TriSoup::load(PARAM(QString, model.default));

	MSG_CHECK_GL;
}

void Viewer::initVBO( bool bDestroy ) 
{
	if ( bDestroy ) {
		destroyVBO();
	}

	// definition VBO avec classes génériques (bablib v2)
	// pour une définition "intègre" OpenGL, il faut les customs attribs (génériques attribs) soient présents dans les shaders
	// sinon il n'est pas possible d'attribuer un id pour les attributs (prog.getAttribID(#name) renvoie -1)
	VERTEX_DATA_SUBCLASS(VDataDef,
	    	DEF_ATTRIB(Vertex, float, 3)
	    	DEF_ATTRIB(Normal, float, 3)
	    	DEF_ATTRIB(Color,  float, 4)
		//
	    )
	
	VDataDef *vd = new VDataDef();

	indexBuffer = new IndexBufferUI(3 * ts->nt);

	vbo = new VertexDataBufferGL(vd, ts->nv);

	for (int i=0; i<ts->nv; i++) {
		vd->vertex.set(i, ts->vertex[i]);
		vd->normal.set(i, ts->normal[i]);
		Vec4 c = Vec4::random(0,1);
		vd->color.set(i, c);
	}
	//vbo->load();

	// remplissage et load de l'index buffer :
	for (int i=0; i < ts->nt; i++) {
		const int 	indice_vertex0 = ts->tri[i].index[0],
					indice_vertex1 = ts->tri[i].index[1],
					indice_vertex2 = ts->tri[i].index[2];			
		//
		indexBuffer->set(3*i + 0, indice_vertex0);
		indexBuffer->set(3*i + 1, indice_vertex1);
		indexBuffer->set(3*i + 2, indice_vertex2);
		//
	}

	vbo->load();
	indexBuffer->load();

	MSG_CHECK_GL;
}

#endif
