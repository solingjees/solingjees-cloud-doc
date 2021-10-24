const Oss = require('ali-oss')
// const  { ossKey,ossSecret, region,bucket }  = require('../config')
const path = require('path')
const fs = require('fs')

class UploadCould{
    constructor(config = {}){
       const initConfig = {
        // region,
        // accessKeyId: ossKey,
        // accessKeySecret: ossSecret,
        // bucket,
       }
       const finalConfig = {
           ...initConfig,
           ...config
       }
       this.connection = new Oss(finalConfig)
    }
    

    async upload (uploadFileName, localPath, allowCover = false) {
        try{
            const res =  await this.connection.put(uploadFileName, path.normalize(localPath),
            {headers: { 'x-oss-forbid-overwrite': !allowCover }});
            return {
                status:200,
                msg:'上传成功',
                data:{
                    path: res.url,
                    name: res.name,
                    updatedAt: new Date(res.res.headers.date).valueOf()
                }
            }
        }catch(e){
            return e
        }
    }

    async download (fileName,localPath) {
        try {
          //流式获取
          const res1 =  await this.connection.head(fileName, {});
           // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
          const result = await this.connection.getStream(fileName);
            // 填写本地文件的完整路径。如果指定的本地文件存在会覆盖，不存在则新建。
            // 如果未指定本地路径，则下载后的文件默认保存到示例程序所属项目对应本地路径中。
          const writeStream = fs.createWriteStream(localPath); 
          result.stream.pipe(writeStream);
          
          return new Promise((resolve,reject)=>{
            writeStream.on('finish',()=>{
               resolve({
                   status: 200,
                   msg:'下载成功',
                   data:{
                        localPath,
                        name:fileName,
                        updatedAt:  new Date(res1.res.headers[ 'last-modified']).valueOf()
                   }
               })
            })
            writeStream.on('error',(e)=>{
                reject(e)
             })
          })
      
        // 直接获取
        //   const result =  await this.connection.get(fileName, path.normalize(localPath));
        //   const res = result.res
        //   if(res.status === 200){
        //     return {
        //         cloudPath: res.requestUrls[0],
        //         localPath: localPath
        //     }
        //   } 
        } catch (e) {
          return e
        }
    }
    
    async deleteFile (fileName) {
        try {
         await this.connection.head(fileName, {});
          // 填写Object完整路径。Object完整路径中不能包含Bucket名称。
         const result =  await this.connection.delete(fileName);
         const res = result.res
         if(res.status === 204){
            return {
                status:200,
                msg:'删除成功',
                data:{
                    path: res.requestUrls[0]
                }
            }
         }
        } catch (e) {
          return e
        }
    }


    async exitFile(fileName){
        try{
          return  await this.connection.head(fileName, {});
        } catch{
           return false
        }
    }

    async  getList () {
        // 不带任何参数，默认最多返回100个文件。
        try{
            let res = await this.connection.list();
            return {
                status:200,
                data:{
                    list: res.objects
                }
            }
            // list item
            // {
            //     name: 'aa.js.md',
            //     url: 'http://solingjees-cloud-doc.oss-cn-hongkong.aliyuncs.com/aa.js.md',
            //     lastModified: '2021-10-21T03:41:43.000Z',
            //     etag: '"736A975C611E1109218A548B9FC75F06"',
            //     type: 'Normal',
            //     size: 4853,
            //     storageClass: 'Standard',
            //     owner: [Object]
            //   },
        }catch(e){
            return e 
        }
        
        
    }
}

module.exports = UploadCould