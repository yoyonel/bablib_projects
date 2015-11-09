#ifndef __PREPROCESS_H__
#define __PREPROCESS_H__

#define ERRORMSG(str)   printf("Error: %s\n",   (char *) str)
#define WARNINGMSG(str) printf("Warning: %s\n", (char *) str)
#define INFOMSG(str)    printf("%s\n",          (char *) str)

// DEFINES
#define LOADDIRSHADER(_qStringDir, _prog) 									\
{														\
	std::cout << "# Load shader, path used : " <<  _qStringDir.toAscii().constData() << std::endl;		\
	_prog.loadDir(_qStringDir);										\
	}													\

#define LOADSHADER(_qStringShader, _prog) 									\
{														\
	std::cout << "# Load shader, path used : " <<  _qStringShader.toAscii().constData() << std::endl;	\
	_prog.load( _qStringShader );										\
	}													\

#endif
