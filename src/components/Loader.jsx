import React from 'react'
import './Loader.scss'

export default  ({text ='处理中'}) => {
    return ( 
    <div className='loading-component text-center'>
       <div class='spinner-grow text-primary' role='status'>
           <span className='sr-only'>{text}</span>
       </div>
       <h5 className='text-primary'>{text}</h5>
    </div>
    )
}